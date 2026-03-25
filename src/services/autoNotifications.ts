import admin, { adminDb as db } from "../lib/admin-db.js";
import { sendTransactionNotification, sendNoticeNotification, sendCommentNotification } from "../lib/admin-notifications.js";

/**
 * Initializes Firestore listeners to automatically send notifications.
 */
export function initAutoNotifications() {
  console.log("Initializing automatic notification listeners...");

  // 1. Listen for new Transactions
  db.collection("transactions").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const transaction = change.doc.data();
        console.log(`New transaction detected: ${change.doc.id}`);

        // Notify all admins about the new transaction
        const adminTokens = await getTokensByRole("admin");
        if (adminTokens.length > 0) {
          const messages = adminTokens.map(token => ({
            token,
            notification: {
              title: 'New Transaction Recorded',
              body: `${transaction.type === 'income' ? 'Income' : 'Expense'} of ₹${transaction.amount} for ${transaction.category}.`,
            },
            data: {
              type: 'TRANSACTION',
              transactionId: change.doc.id,
            }
          }));
          
          try {
            await admin.messaging().sendEach(messages);
          } catch (error) {
            console.error("Error sending transaction notifications:", error);
          }
        }
      }
    });
  });

  // 2. Listen for new Notices
  db.collection("notices").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const notice = change.doc.data();
        console.log(`New notice detected: ${change.doc.id}`);

        // Notify all residents about the new notice
        const allTokens = await getAllTokens();
        if (allTokens.length > 0) {
          await sendNoticeNotification(allTokens, notice.title, notice.content);
        }
      }
    });
  });

  // 3. Listen for new Comments (using collectionGroup to catch comments in any transaction)
  db.collectionGroup("comments").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const comment = change.doc.data();
        const transactionRef = change.doc.ref.parent.parent;
        
        if (transactionRef) {
          const transactionDoc = await transactionRef.get();
          const transaction = transactionDoc.data();
          
          if (transaction && transaction.createdBy !== comment.createdBy) {
            console.log(`New comment detected on transaction ${transactionRef.id}`);
            
            // Notify the creator of the transaction
            const creatorTokens = await getTokensByFlatNo(transaction.createdBy);
            for (const token of creatorTokens) {
              await sendCommentNotification(token, transactionRef.id, comment.createdBy);
            }
          }
        }
      }
    });
  });
}

/**
 * Helper to get FCM tokens for a specific role.
 */
async function getTokensByRole(role: string): Promise<string[]> {
  const flatsSnapshot = await db.collection("flats").where("role", "==", role).get();
  const flatNos = flatsSnapshot.docs.map(doc => doc.id);
  
  if (flatNos.length === 0) return [];
  
  const tokensSnapshot = await db.collection("fcm_tokens").where("flatNo", "in", flatNos).get();
  return tokensSnapshot.docs.map(doc => doc.data().token);
}

/**
 * Helper to get FCM tokens for a specific flat number.
 */
async function getTokensByFlatNo(flatNo: string): Promise<string[]> {
  const tokensSnapshot = await db.collection("fcm_tokens").where("flatNo", "==", flatNo).get();
  return tokensSnapshot.docs.map(doc => doc.data().token);
}

/**
 * Helper to get all registered FCM tokens.
 */
async function getAllTokens(): Promise<string[]> {
  const tokensSnapshot = await db.collection("fcm_tokens").get();
  return tokensSnapshot.docs.map(doc => doc.data().token);
}

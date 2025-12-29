import {adminDb} from '$lib/firebase/firebase.admin'

export const fetchByQuery = async (collection: string, field: string, value: string) => {
	const snapshot = await adminDb.collection(collection).where(field, '==', value).get()
	const docs = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}))
	return docs
}

export const fetchById = async (collection: string, id: string) => {
	const doc = await adminDb.collection(collection).doc(id).get()
	return {...doc.data(), id: doc.id}
}

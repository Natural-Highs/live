import type { CollectionReference, QuerySnapshot } from 'firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';

// Mock Firestore functions
vi.mock('firebase/firestore', () => {
  const mockDocs = [
    { data: () => ({ email: 'abc@gmail.com', name: 'Bob Fred' }) },
    { data: () => ({ email: 'def@gmail.com', name: 'John Green' }) },
    { data: () => ({ email: 'ghi@gmail.com', name: 'Alan Doe' }) },
    { data: () => ({ email: 'jkl@gmail.com', name: 'Lisa Powers' }) },
    { data: () => ({ email: 'mno@gmail.com', name: 'Ryan Wow' }) },
  ];

  const mockCollectionRef = {
    id: 'users',
    path: 'users',
  } as CollectionReference;

  return {
    collection: vi.fn((_db: unknown, path: string) => {
      return path === 'users' ? mockCollectionRef : ({} as CollectionReference);
    }),
    getDocs: vi.fn(async (_query: CollectionReference | unknown) => {
      return {
        docs: mockDocs,
      } as unknown as QuerySnapshot;
    }),
  };
});

describe('Firebase Firestore Tests', () => {
  it('fetches all users from the mock users collection', async () => {
    const mockDb = {} as Parameters<typeof collection>[0];
    const collectionRef = collection(mockDb, 'users');
    const userDocs = await getDocs(collectionRef);

    const users = userDocs.docs.map(doc => doc.data());
    expect(users).toEqual([
      { email: 'abc@gmail.com', name: 'Bob Fred' },
      { email: 'def@gmail.com', name: 'John Green' },
      { email: 'ghi@gmail.com', name: 'Alan Doe' },
      { email: 'jkl@gmail.com', name: 'Lisa Powers' },
      { email: 'mno@gmail.com', name: 'Ryan Wow' },
    ]);
  });

  it('fetches a user based on the email', async () => {
    const mockDb = {} as Parameters<typeof collection>[0];
    const collectionRef = collection(mockDb, 'users');
    const userDocs = await getDocs(collectionRef);
    const users = userDocs.docs.map(doc => doc.data());
    const user = users.find(u => u.email === 'abc@gmail.com');

    expect(user).toEqual({ email: 'abc@gmail.com', name: 'Bob Fred' });
  });

  it('fetches a user based on the name', async () => {
    const mockDb = {} as Parameters<typeof collection>[0];
    const collectionRef = collection(mockDb, 'users');
    const userDocs = await getDocs(collectionRef);
    const users = userDocs.docs.map(doc => doc.data());
    const user = users.find(u => u.name === 'John Green');
    expect(user).toEqual({ email: 'def@gmail.com', name: 'John Green' });
  });
});

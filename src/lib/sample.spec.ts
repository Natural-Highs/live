import { describe, it, expect, beforeEach, vi } from 'vitest';
// describe is for a test suite(multiple tests)
// it is for a single test
// expect provides assertion functions
// beforeEach sets up code before each test
// vi is Vitests build in mocking utility
import { getDocs, collection } from "firebase/firestore";
import { mockFirebase } from 'firestore-vitest-mock';

// Mock Firestore functions
vi.mock("firebase/firestore", () => {
    // actual allows us to use the real module
    const actual = vi.importActual("firebase/firestore");

    return {
    collection: vi.fn(() => "users"), // Mock collection
    getDocs: vi.fn(() => ({
        // predefine the data in the doc
        docs: [
        { data: () => ({ email: "abc@gmail.com", name: "Bob Fred" }) },
        { data: () => ({ email: "def@gmail.com", name: "John Green" }) },
        { data: () => ({ email: "ghi@gmail.com", name: "Alan Doe" }) },
        { data: () => ({ email: "jkl@gmail.com", name: "Lisa Powers" }) },
        { data: () => ({ email: "mno@gmail.com", name: "Ryan Wow" }) }
        ]
    })),
    };
});

describe("Firebase Firestore Tests", () => {

    it("fetches all users from the mock users collection", async () => {
        const userDocs = await getDocs(collection({}, "users"));
        // Validate the returned documents
        const users = userDocs.docs.map((doc) => doc.data());
        expect(users).toEqual([
            { email: "abc@gmail.com", name: "Bob Fred" },
            { email: "def@gmail.com", name: "John Green" },
            { email: "ghi@gmail.com", name: "Alan Doe" },
            { email: "jkl@gmail.com", name: "Lisa Powers" },
            { email: "mno@gmail.com", name: "Ryan Wow" }
        ]);
    });

    it("fetches a user based on the email", async () => {
        const userDocs = await getDocs(collection({}, "users"));
        const users = userDocs.docs.map((doc) => doc.data());
        const user = users.find((u) => u.email === "abc@gmail.com");

        expect(user).toEqual({ email: "abc@gmail.com", name: "Bob Fred" });
      });

    it("fetches a user based on the name", async() => {
        const userDocs = await getDocs(collection({}, "users"));
        const users = userDocs.docs.map((doc) => doc.data());
        const user = users.find((u) => u.name === "John Green");
        expect(user).toEqual({ email: "def@gmail.com", name: "John Green"});
    })
});

// INSTALL DEPENDENCIES 
// npm install vitest --save-dev
// npm install firestore-vitest-mock --save-dev


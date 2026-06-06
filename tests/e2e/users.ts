// Shared test-user registry. `+clerk_test` = Clerk reserved test emails that
// verify with the fixed code 424242 (no real inbox needed).
export const TEST_USERS = {
  customer: {
    email: "spice.customer+clerk_test@example.com",
    firstName: "Test Customer",
    admin: false,
    id: "" as string,
  },
  admin: {
    email: "spice.admin+clerk_test@example.com",
    firstName: "Test Admin",
    admin: true,
    id: "" as string,
  },
};

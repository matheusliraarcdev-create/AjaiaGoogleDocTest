export const DEMO_PASSWORD = "folio-demo";
export const SESSION_COOKIE = "folio_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const MAX_TITLE_LENGTH = 140;
export const MAX_CONTENT_LENGTH = 500_000;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const SEEDED_DOCUMENT_ID = "44444444-4444-4444-8444-444444444444";
export const SEEDED_DOCUMENT_TITLE = "Product kickoff notes";

export const SEED_USERS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ada Okonkwo",
    email: "ada@ajaia.test",
    hint: "Owns the kickoff notes",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Lin Zhao",
    email: "lin@ajaia.test",
    hint: "Can edit the kickoff notes",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Noah Patel",
    email: "noah@ajaia.test",
    hint: "No shared documents yet",
  },
] as const;

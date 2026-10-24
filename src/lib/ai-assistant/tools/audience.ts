// navigateToPage and openFormDialog list every target, including the ones the user's role
// can't use, marked "(residents only)" / "(admins only)". Left out, a request for one gets
// the closest target that is listed (an admin asking for a Certificate of Indigency got
// "Submit a Business"). For those, `execute` returns `buttonShown: false` with what to tell
// the user instead, and the chat panel shows no button.
export const AUDIENCE_NOTES = { resident: " (residents only)", admin: " (admins only)", all: "" } as const;

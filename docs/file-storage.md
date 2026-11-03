# File storage

Every uploaded file lives in one private Cloudflare R2 bucket. Browsers never get the bucket's credentials. They upload and download through short-lived presigned URLs that `/api/r2` hands out after checking who's asking. The database stores only each file's object key and metadata.

## The pieces

| File | Side | What it does |
|---|---|---|
| `src/lib/r2.ts` | Server only | The S3 client pointed at `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, and the bucket name |
| `src/app/api/r2/route.ts` | Server | `POST` (presigned upload), `GET` (redirect to a presigned download), `DELETE` |
| `src/lib/storage.ts` | Client | `uploadFile`, `fetchFile`, `deleteFile`, and the allowed upload prefixes |
| `src/components/file-uploader.tsx` | Client | The drag-and-drop field every form uses, and the `MediaItem` type |

## Uploading

```ts
// In a dialog's mutation, before calling the server action:
const evidence = await Promise.all(
  data.evidence.map(async (item) => {
    if (!item.file) return item; // already uploaded (when editing)
    const key = await uploadFile(item.file, "complaints/evidence");
    return { ...item, key, file: undefined };
  })
);
await createComplaint({ ...data, evidence });
```

1. `uploadFile(file, prefix)` POSTs `{ prefix, name, type }` to `/api/r2`.
2. The route checks the caller is signed in and the prefix is in `PUBLIC_UPLOAD_PREFIXES` or `PRIVATE_UPLOAD_PREFIXES`. Public prefixes are admin-only.
3. The route builds the key itself, so an upload can't overwrite another file and the key records who uploaded it:

   ```
   <prefix>/<userId>/<uuid>-<file name with "/" replaced by "_">
   e.g. complaints/evidence/user_2abc…/3f1e…-pothole.jpg
   ```

4. It returns the key and a presigned `PUT` URL that expires in 60 seconds, signed with the file's content type.
5. The browser `PUT`s the file straight to R2 and returns the key.

The form then sends the server action a list of `Omit<MediaItem, "file">` objects, which it stores in a JSON column:

```ts
type MediaItem = {
  file?: File;          // only while the form holds a new, not yet uploaded file
  key?: string;         // the R2 object key
  name: string;         // the original file name, for display
  type: "image" | "video" | "document";
  size?: number;
  contentType?: string;
};
```

Because the bucket must accept browser `PUT`s, its CORS policy has to allow the app's origin (see [Getting started](getting-started.md#5-cloudflare-r2)).

## Downloading

`fetchFile(key)` returns `/api/r2?key=<key>`, a URL that can go straight into an `<img src>`, a `<video>`, or a link. The route:

1. Rejects a key with a `..` segment.
2. For a key outside the public prefixes, requires a signed-in user.
3. Redirects (302) to a presigned `GET` URL that expires in an hour.

Any signed-in user who knows a private key can download it. Keys contain a random UUID and are only sent to people allowed to see the record, which is what keeps private files private.

## Deleting

`deleteFile(key)` sends `DELETE /api/r2` with the key. Admins can delete any object. Residents can delete only keys under `<prefix>/<their userId>/`, so files uploaded before keys included the uploader can only be removed by an admin.

R2 has nothing like a cascading delete. Who removes a file depends on how its record goes away:

| Event | Who deletes the files |
|---|---|
| A submission or post is deleted from its dialog | The dialog, in the browser, after the delete action succeeds |
| A file is removed while editing a post, business, official or Resident Credentials | The edit dialog, after comparing the old and new keys |
| A status moves away from Ready for Pickup/Claimed, Rejected, Resolved or Dismissed | The actions menu deletes that status's reply attachments before changing the status |
| A user becomes an admin | `updateUserRole` deletes their valid ID photos on the server |
| A super admin deletes a deleted user's data | `deleteAllUserData` deletes every file in the user's rows on the server, after the rows, in batches of 1000 |
| A knowledge base document is removed | `deleteKnowledgeBaseDocument`, on the server |

Most cleanup runs in the browser after the database write, so if the tab closes mid-way, or a delete request fails, the file stays in the bucket with nothing pointing to it. That's harmless apart from storage, and nothing sweeps such files up. The reverse can't happen: a row never points to a file that was deleted first.

Two flows avoid orphans by delaying the upload: a complaint's evidence is uploaded only once the resident decides to file rather than follow an existing complaint, and form files are uploaded only on submit.

## Upload prefixes

Every upload location is listed in `src/lib/storage.ts`. An upload to any other prefix is rejected with 400.

### Public prefixes

Files shown on the signed-out pages. Anyone can view them, and only admins can upload.

| Prefix | Used for |
|---|---|
| `officials` | Official photos |
| `news/media`, `news/attachments` | News photos and videos, and attached documents |
| `transparency/media`, `transparency/attachments` | Project photos and videos, and attached documents |

### Private prefixes

Files that need a signed-in user to view.

| Prefix | Used for |
|---|---|
| `profile/valid-id` | Valid ID photos (Resident Credentials) |
| `complaints/evidence` | Evidence photos and videos |
| `complaints/resolution-attachments`, `complaints/dismissal-attachments` | The admin's reply files |
| `document-requests/payment-receipts` | Barangay Clearance GCash receipts |
| `document-requests/supporting-documents` | Indigency, Solo Parent and Medical / Lab Assistance documents |
| `document-requests/pickup-attachments` | Files sent with Ready for Pickup, including the soft copy itself |
| `document-requests/rejection-attachments` | Files sent with a rejection |
| `court-reservations/gcash-payments` | GCash payment screenshots |
| `court-reservations/rejection-attachments` | Files sent with a rejection |
| `community-hub/photos` | Business photos |
| `community-hub/permits` | Business permits |
| `community-hub/rejection-attachments` | Files sent with a rejection |
| `knowledge-base` | AI knowledge base PDFs |

## Accepted files and limits

`FileUploader` takes `maxFiles` and `accept` (any of `"images"`, `"videos"`, `"documents"`), and enforces per-kind size limits: 15 MB for images, 100 MB for videos and 15 MB for documents by default. "Documents" means PDF, Word, Excel, PowerPoint and plain text.

| Field | Max files | Accepts |
|---|---|---|
| Valid ID front, back | 1 each | Images |
| Complaint evidence | 5 | Images, videos |
| Clearance payment receipt | 1 | Images |
| Supporting documents | 5 | Images, documents |
| Court GCash payment | 1 | Images |
| Business photos | 10 | Images |
| Business permit | 1 | Documents |
| News and project media | 10 | Images, videos |
| News and project attachments | 3 | Documents |
| Official photo | 1 | Images |
| Admin reply attachments (pickup, rejection, resolution, dismissal) | 5 | Images, documents |
| Knowledge base | many, one at a time | PDF, 15 MB each (`MAX_KNOWLEDGE_BASE_FILE_SIZE`) |

These limits are checked in the browser. The presigned URL doesn't limit size.

## Displaying files

- `MediaGrid` and `AttachmentList` (`src/components/media-gallery.tsx`) render a post's or submission's files, with `MediaLightbox` for full-screen viewing.
- `MediaPreviewList` (`src/components/media-preview-list.tsx`) is a compact list for dialogs.
- Open Graph images on the public news and project pages point to `/api/r2?key=…` with the site's origin, which works for crawlers because those prefixes are public.

## Adding an upload location

1. Add the prefix to `PUBLIC_UPLOAD_PREFIXES` if the files appear on signed-out pages, otherwise to `PRIVATE_UPLOAD_PREFIXES`. Without this, the route rejects the upload.
2. Add a `json().$type<Omit<MediaItem, "file">[]>().notNull().default([])` column for it (see [Database](database.md#keeping-the-database-in-sync)).
3. Upload in the dialog's mutation with `uploadFile(item.file, "<prefix>")` before calling the action.
4. Delete the files wherever the record or field can go away: the delete dialog, the edit dialog (removed keys) and, if the files belong to a user, `deleteAllUserData`'s list of columns.

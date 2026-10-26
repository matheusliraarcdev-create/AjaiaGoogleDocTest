export type Permission = "view" | "edit";
export type Access = "owner" | Permission;

export type User = {
  id: string;
  name: string;
  email: string;
};

export type ShareRecord = {
  userId: string;
  name: string;
  email: string;
  permission: Permission;
};

export type DocumentSummary = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
  access: Access;
};

export type DocumentRecord = DocumentSummary & {
  contentHtml: string;
  ownerEmail: string;
  createdAt: string;
  shares: ShareRecord[];
};

export type ActionError = {
  ok: false;
  status: number;
  error: string;
};

export type ActionOk<T> = {
  ok: true;
  value: T;
};

export type ActionResult<T> = ActionOk<T> | ActionError;

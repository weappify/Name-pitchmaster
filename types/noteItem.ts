export type NoteItem = {
  id: string;
  title: string;
  content: string;
  linkedFieldSetupId?: string | null;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
};

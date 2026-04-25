export type ProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  date_of_birth: string | null;
  is_admin: boolean;
  created_at: string;
};

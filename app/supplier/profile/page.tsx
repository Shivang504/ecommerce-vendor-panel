import { ProfileClient } from './profile-client';

export const metadata = {
  title: 'Profile | Admin',
  description: 'Manage your profile information',
};

export default function ProfilePage() {
  return (
    <ProfileClient />
  );
}

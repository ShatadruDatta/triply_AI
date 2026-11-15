import { deleteUser } from './delete-user';
import { syncUser } from './sync-user';
import { updateUser } from './update-user';

export const functions = [syncUser, updateUser, deleteUser];

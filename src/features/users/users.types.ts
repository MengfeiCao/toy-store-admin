export type ManagedUserRole = 'owner' | 'staff';
export type ManagedUserStatus = 'active' | 'disabled';
export interface ManagedUser { id: string; email: string; name: string; role: ManagedUserRole; status: ManagedUserStatus; createdAt: string; }
export interface CreateStaffInput { email: string; name: string; password: string; }

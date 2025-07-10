// src/shared/enums/user-role.enum.ts
export enum UserRole {
  ADMIN = "ADMIN",           // מנהל מערכת
  MANAGER = "MANAGER",       // מנהלת
  OPERATOR = "OPERATOR",     // מתפעל
  CLIENT = "CLIENT",         // לקוח
  GUEST = "GUEST"            // אורח
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: "מנהל מערכת",
  [UserRole.MANAGER]: "מנהלת",
  [UserRole.OPERATOR]: "מתפעל",
  [UserRole.CLIENT]: "לקוח",
  [UserRole.GUEST]: "אורח"
};

export const UserRolePermissions: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'admin',
    'manage_users',
    'view_all_requests',
    'manage_all_requests',
    'manage_settings',
    'export_data',
    'view_reports',
    'create_templates',
    'delete_data'
  ],
  [UserRole.MANAGER]: [
    'view_all_requests',
    'manage_all_requests',
    'assign_requests',
    'final_approval',
    'view_reports',
    'export_data'
  ],
  [UserRole.OPERATOR]: [
    'view_assigned_requests',
    'process_requests',
    'upload_documents',
    'contact_clients'
  ],
  [UserRole.CLIENT]: [
    'view_own_requests',
    'create_request',
    'upload_documents',
    'schedule_appointment'
  ],
  [UserRole.GUEST]: [
    'create_request'
  ]
};
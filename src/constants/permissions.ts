export const ROLE_PERMISSIONS = {
  Owner: {
    canPromote: true,
    canEditName: true,
    canManageRoles: true,
    canInvite: true,
    canEditSettings: true,
  },
  R5: {
    canPromote: true,
    canEditName: true,
    canManageRoles: true,
    canInvite: true,
    canEditSettings: false,
  },
  R4: {
    canPromote: false,
    canEditName: true,
    canManageRoles: false,
    canInvite: true,
    canEditSettings: false,
  },
  Mod: {
    canPromote: false,
    canEditName: true,
    canManageRoles: false,
    canInvite: true,
    canEditSettings: false,
  },
  Member: {
    canPromote: false,
    canEditName: false,
    canManageRoles: false,
    canInvite: false,
    canEditSettings: false,
  },
};

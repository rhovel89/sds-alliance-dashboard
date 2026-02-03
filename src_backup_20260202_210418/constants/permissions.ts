export const PERMISSIONS = {
  Owner: {
    editName: true,
    promote: true,
    manageRoles: true,
    invite: true
  },
  Mod: {
    editName: true,
    promote: true,
    manageRoles: false,
    invite: true
  },
  Member: {
    editName: false,
    promote: false,
    manageRoles: false,
    invite: false
  }
};


// Alias export for roster UI compatibility
export const ROLE_PERMISSIONS = PERMISSIONS;

export const ROLE_PERMISSIONS = {
  Owner: {
    editGameName: true,
    promote: true,
    demote: true,
    invite: true,
    viewAudit: true
  },
  Mod: {
    editGameName: true,
    promote: false,
    demote: false,
    invite: true,
    viewAudit: false
  },
  Member: {
    editGameName: false,
    promote: false,
    demote: false,
    invite: false,
    viewAudit: false
  }
};

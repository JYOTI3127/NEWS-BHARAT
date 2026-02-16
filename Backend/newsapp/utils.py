def has_permission(user, perm_code):
    if not hasattr(user, 'userprofile'):
        return False

    roles = user.userprofile.roles.all()

    for role in roles:
        if role.permissions.filter(code=perm_code).exists():
            return True

    return False

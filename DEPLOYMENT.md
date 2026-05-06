# Frontend Auto Deploy

Use these GitHub repository secrets:

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USER`
- `DEPLOY_SSH_PASSWORD`
- `DEPLOY_PATH`

`DEPLOY_PATH` must point to the frontend repo directory on the VM. The workflow pulls `main` and resets the VM copy to match GitHub.

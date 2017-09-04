import { git, GitError, IGitExecutionOptions } from '../core/git'
import { Repository } from '../model/repository'
import { PullProgressParser, executionOptionsWithProgress } from '../progress'
import { IPullProgress } from '../progress'

/**
 * Pull from the specified remote.
 *
 * @param repository - The repository in which the pull should take place
 *
 * @param remote     - The name of the remote that should be pulled from
 *
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress
 *                           of the pull operation. When provided this enables
 *                           the '--progress' command line flag for
 *                           'git pull'.
 */
export async function pull(
  repository: Repository,
  remote: string,
  progressCallback?: (progress: IPullProgress) => void
): Promise<void> {
  let opts: IGitExecutionOptions = {}
  if (progressCallback) {
    const title = `Pulling ${remote}`
    const kind = 'pull'

    opts = executionOptionsWithProgress(
      opts,
      new PullProgressParser(),
      progress => {
        // In addition to progress output from the remote end and from
        // git itself, the stderr output from pull contains information
        // about ref updates. We don't need to bring those into the progress
        // stream so we'll just punt on anything we don't know about for now.
        if (progress.kind === 'context') {
          if (!progress.text.startsWith('remote: Counting objects')) {
            return
          }
        }

        const description =
          progress.kind === 'progress' ? progress.details.text : progress.text

        const value = progress.percent

        progressCallback({ kind, title, description, value, remote })
      }
    )

    // Initial progress
    progressCallback({ kind, title, value: 0, remote })
  }

  const args = progressCallback
    ? ['pull', '--no-rebase', '--progress', remote]
    : ['pull', '--no-rebase', remote]

  const result = await git(args, repository.path, 'pull', opts)

  if (result.gitErrorDescription) {
    throw new GitError(result, args)
  }
}

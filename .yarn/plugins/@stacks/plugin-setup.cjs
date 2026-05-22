module.exports = {
    name: `@stacks/plugin-setup`,
    factory: require => {
        const { Command } = require(`clipanion`);
        const { spawnSync } = require(`child_process`);
        const fs = require(`fs`);
        const path = require(`path`);

        function run(command, args, opts) {
            const result = spawnSync(command, args, { stdio: `inherit`, ...opts });
            if (result.status !== 0) {
                process.exitCode = result.status ?? 1;
                return false;
            }
            return true;
        }

        class SetupCommand extends Command {
            static paths = [[`setup`]];

            async execute() {
                const cwd = process.cwd();

                if (!run(`bash`, [`scripts/clean.sh`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`install`, `--mode=skip-build`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`build:internal`], { cwd })) return process.exitCode ?? 1;
                if (!run(`node`, [`scripts/prune-nested-workspace-stacks.cjs`], { cwd }))
                    return process.exitCode ?? 1;

                return 0;
            }
        }

        class ReleaseCommand extends Command {
            static paths = [[`release`]];

            async execute() {
                const cwd = process.cwd();
                const stateFilePath = path.join(cwd, `node_modules`, `.yarn-state.yml`);

                if (!fs.existsSync(stateFilePath)) {
                    if (!run(`yarn`, [`install`], { cwd })) return process.exitCode ?? 1;
                }

                if (!run(`bash`, [`scripts/clean.sh`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`install`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`build:internal`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`build:app`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`build:server`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`build:email-service`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:structure`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:server`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:app`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:email-service`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:db`], { cwd })) return process.exitCode ?? 1;
                if (!run(`yarn`, [`release:docker`], { cwd })) return process.exitCode ?? 1;

                return 0;
            }
        }

        return {
            commands: [SetupCommand, ReleaseCommand],
        };
    },
};

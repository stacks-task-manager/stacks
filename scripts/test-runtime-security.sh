#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="${1:-${repo_root}/releases}"
compose_file="${repo_root}/docker/docker-compose.yml"
server_build_config="${repo_root}/packages/server/esbuild.config.js"
run_copy_script="$(node -p 'require(process.argv[1]).scripts["run:copy"]' "${repo_root}/package.json")"
tmp_dir="$(mktemp -d)"
images=()
containers=()
networks=()
cleanup() {
    if ((${#containers[@]})); then
        docker rm -f "${containers[@]}" >/dev/null 2>&1 || true
    fi
    if ((${#networks[@]})); then
        docker network rm "${networks[@]}" >/dev/null 2>&1 || true
    fi
    if ((${#images[@]})); then
        docker image rm -f "${images[@]}" >/dev/null 2>&1 || true
    fi
    python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "${tmp_dir}"
}
trap cleanup EXIT

for dockerfile in Dockerfile.server Dockerfile.email Dockerfile.migration; do
    if ! grep -Eq '^USER[[:space:]]+node([[:space:]]|$)' "${repo_root}/docker/${dockerfile}"; then
        echo "${dockerfile} must run as the non-root node user" >&2
        exit 1
    fi
done

if grep -Fq 'copyEnvFile' "${server_build_config}"; then
    echo "The server build must not copy its configured .env file into dist" >&2
    exit 1
fi
if grep -Eq '^POSTGRES_PASSWORD=postgres$' "${repo_root}/docker/.env.example"; then
    echo "The Docker environment example must not provide a weak PostgreSQL bootstrap password" >&2
    exit 1
fi
if [[ "${run_copy_script}" == *"packages/server/.env"* ]]; then
    echo "The release copy script must not place configured server secrets in the release bundle" >&2
    exit 1
fi
if [[ -e "${repo_root}/packages/server/dist/.env" ]]; then
    echo "The generated server dist contains a .env file; remove it before packaging" >&2
    exit 1
fi

if ! grep -Fq 'user: "${STACKS_UID:-1000}:${STACKS_GID:-1000}"' "${compose_file}"; then
    echo "Compose must allow the server UID/GID to match host bind-mount ownership" >&2
    exit 1
fi
node - "${compose_file}" <<'NODE'
const fs = require("node:fs");
const YAML = require("yaml");
const compose = YAML.parse(fs.readFileSync(process.argv[2], "utf8"));
const getEnvironment = (service, key) => {
    const environment = service.environment ?? {};
    if (Array.isArray(environment)) {
        const entry = environment.find(value => value.startsWith(`${key}=`));
        return entry?.slice(key.length + 1);
    }
    return environment[key];
};
for (const name of ["stacks", "email", "migration", "role-bootstrap"]) {
    const service = compose.services?.[name];
    if (!service) throw new Error(`Compose is missing the ${name} service`);
    if (service.read_only !== true) throw new Error(`The ${name} container must use a read-only root filesystem`);
    if (!service.cap_drop?.includes("ALL")) throw new Error(`The ${name} container must drop all Linux capabilities`);
    if (!service.security_opt?.includes("no-new-privileges:true")) {
        throw new Error(`The ${name} container must enable no-new-privileges`);
    }
    if (getEnvironment(service, "NODE_ENV") !== "production") {
        throw new Error(`The ${name} container must explicitly run in production mode`);
    }
    if (!service.tmpfs?.some(mount => mount.startsWith("/tmp:"))) {
        throw new Error(`The read-only ${name} container must provide writable temporary storage`);
    }
}
const service = compose.services.stacks;
if (!service.ports?.some(port => typeof port === "string" && port.startsWith("${STACKS_BIND_ADDRESS:-127.0.0.1}:"))) {
    throw new Error("The stacks HTTP port must bind to loopback by default");
}
const license = service.volumes?.find(volume =>
    typeof volume === "string" ? volume.includes(":/server/license.key") : volume.target === "/server/license.key"
);
if (!license || (typeof license === "string" ? !license.endsWith(":ro") : license.read_only !== true)) {
    throw new Error("The license key mount must be read-only");
}
const email = compose.services.email;
const migration = compose.services.migration;
if (getEnvironment(service, "POSTGRES_USER") !== "${POSTGRES_APP_USER:-stacks_app}") {
    throw new Error("The API must connect with the restricted application database role");
}
if (getEnvironment(email, "POSTGRES_USER") !== "${POSTGRES_APP_USER:-stacks_app}") {
    throw new Error("The email worker must connect with the restricted application database role");
}
if (getEnvironment(migration, "POSTGRES_USER") !== "${POSTGRES_USER:-postgres}") {
    throw new Error("Schema migrations must use the dedicated database bootstrap role");
}
if (getEnvironment(service, "AI_CHAT_DEBUG_DIR") !== "/var/log/ai-chat-debug") {
    throw new Error("The API must store private AI debug logs under the writable logs mount");
}
if (compose.services.postgres?.ports?.length) {
    throw new Error("PostgreSQL must not publish a host port");
}
NODE

release_legal_script="$(node -p 'require(process.argv[1]).scripts["release:legal"]' "${repo_root}/package.json")"
if [[ "${release_legal_script}" != *"releases/server/legal"* ]]; then
    echo "The release bundle must keep legal files outside the bundled license module" >&2
    exit 1
fi
cp "${repo_root}/LICENSE" "${repo_root}/NOTICE" "${tmp_dir}/"
(cd "${tmp_dir}" && sh -c "${release_legal_script}")
for path in releases/server/legal/LICENSE releases/email-service/legal/LICENSE releases/db/legal/LICENSE; do
    if [[ ! -f "${tmp_dir}/${path}" ]]; then
        echo "The release script did not place ${path}" >&2
        exit 1
    fi
done
for service in server email-service db; do
    dockerfile="${repo_root}/docker/Dockerfile.$([[ "${service}" == "email-service" ]] && echo email || ([[ "${service}" == "db" ]] && echo migration || echo server))"
    if ! grep -Eq "^COPY( --chmod=0444)? ${service}/legal/LICENSE" "${dockerfile}"; then
        echo "${dockerfile} must copy legal files from ${service}/legal" >&2
        exit 1
    fi
done

if [[ "${2:-static}" == "static" ]]; then
    echo "Docker runtime privilege configuration checks passed"
    exit 0
fi

if [[ "${2}" != "runtime" ]]; then
    echo "Usage: $0 [release-directory] [static|runtime]" >&2
    exit 2
fi

for path in server/package.json email-service/package.json db/package.json; do
    if [[ ! -f "${release_dir}/${path}" ]]; then
        echo "Missing ${release_dir}/${path}; run the documented release build first" >&2
        exit 2
    fi
done
if [[ -e "${release_dir}/server/.env" ]]; then
    echo "The server release context contains a .env file; refusing to build an image with secrets" >&2
    exit 1
fi

tag_suffix="security-check-$$"
server_image="stacks-${tag_suffix}-server"
email_image="stacks-${tag_suffix}-email"
migration_image="stacks-${tag_suffix}-migration"
images=("${server_image}" "${email_image}" "${migration_image}")

docker build -t "${server_image}" -f "${release_dir}/Dockerfile.server" "${release_dir}"
docker build -t "${email_image}" -f "${release_dir}/Dockerfile.email" "${release_dir}"
docker build -t "${migration_image}" -f "${release_dir}/Dockerfile.migration" "${release_dir}"

test_suffix="security-db-$$"
test_network="stacks-${test_suffix}-network"
test_database="stacks-${test_suffix}-postgres"
test_role="stacks_app_test"
test_password="security-role-test-password-$$"
networks+=("${test_network}")
containers+=("${test_database}")
docker network create "${test_network}" >/dev/null
docker run -d --name "${test_database}" --network "${test_network}" \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=test-bootstrap-password \
    -e POSTGRES_DB=stacks_test postgres:15-alpine >/dev/null
for _ in {1..30}; do
    if docker exec "${test_database}" pg_isready -U postgres -d stacks_test >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
docker exec "${test_database}" pg_isready -U postgres -d stacks_test >/dev/null
docker exec "${test_database}" psql -U postgres -d stacks_test -v ON_ERROR_STOP=1 \
    -c 'GRANT CREATE ON SCHEMA public TO PUBLIC' >/dev/null
docker exec "${test_database}" psql -U postgres -d stacks_test -v ON_ERROR_STOP=1 \
    -c 'CREATE TABLE public.role_probe_existing (id serial PRIMARY KEY, value text)' >/dev/null
docker run --rm --network "${test_network}" --read-only --cap-drop=ALL \
    --security-opt=no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,size=64m,mode=1777 \
    -e POSTGRES_HOST="${test_database}" -e POSTGRES_PORT=5432 -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=test-bootstrap-password -e POSTGRES_DB=stacks_test \
    -e POSTGRES_APP_USER="${test_role}" -e POSTGRES_APP_PASSWORD="${test_password}" \
    --entrypoint sh "${migration_image}" /db/provision-postgres-app-role.sh
docker exec "${test_database}" psql -U postgres -d stacks_test -v ON_ERROR_STOP=1 \
    -c 'CREATE TABLE public.role_probe_future (id serial PRIMARY KEY, value text)' >/dev/null
docker run --rm --network "${test_network}" -e PGPASSWORD="${test_password}" postgres:15-alpine \
    psql -h "${test_database}" -U "${test_role}" -d stacks_test -v ON_ERROR_STOP=1 \
    -c "INSERT INTO public.role_probe_existing(value) VALUES ('ok'); INSERT INTO public.role_probe_future(value) VALUES ('ok')" >/dev/null
role_attributes="$(docker exec "${test_database}" psql -U postgres -d stacks_test -Atc \
    "SELECT concat(rolsuper::int, rolcreatedb::int, rolcreaterole::int, rolreplication::int, rolbypassrls::int) FROM pg_roles WHERE rolname = '${test_role}'")"
if [[ "${role_attributes}" != "00000" ]]; then
    echo "The application database role has privileged attributes: ${role_attributes}" >&2
    exit 1
fi
if docker run --rm --network "${test_network}" -e PGPASSWORD="${test_password}" postgres:15-alpine \
    psql -h "${test_database}" -U "${test_role}" -d stacks_test -v ON_ERROR_STOP=1 \
    -c 'CREATE TABLE public.role_probe_denied (id int)' >/dev/null 2>&1; then
    echo "The application database role unexpectedly created a table" >&2
    exit 1
fi
docker rm -f "${test_database}" >/dev/null
containers=()
docker network rm "${test_network}" >/dev/null
networks=()
echo "Application database role provisioning passed least-privilege runtime checks"

for image in "${server_image}" "${email_image}" "${migration_image}"; do
    docker run --rm --entrypoint sh "${image}" -ec 'test "$(id -u)" -ne 0'
    docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
        --tmpfs /tmp:rw,nosuid,nodev,size=64m,mode=1777 \
        --entrypoint node "${image}" -e '
const fs = require("node:fs");
const status = fs.readFileSync("/proc/self/status", "utf8");
if (!/^NoNewPrivs:\s+1$/m.test(status) || !/^CapEff:\s+0+$/m.test(status)) {
    throw new Error("Container privilege restrictions are not active");
}
fs.writeFileSync("/tmp/security-runtime-probe", "ok");
'
done
docker run --rm --entrypoint sh "${server_image}" -ec \
    'test ! -e /server/.env && test -r /server/legal/LICENSE && test -r /server/legal/NOTICE && test -r /ms-playwright && test -w /server/.ai-chat-debug'
docker run --rm --network none --read-only --cap-drop=ALL --security-opt=no-new-privileges \
    --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 \
    --tmpfs /home/node/.cache:rw,nosuid,nodev,size=64m,uid=1000,gid=1000,mode=0700 \
    --entrypoint node "${server_image}" -e '
const { chromium } = require("playwright");
(async () => {
    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
        const page = await browser.newPage({ javaScriptEnabled: false });
        await page.setContent("<p>isolated runtime probe</p>", { waitUntil: "domcontentloaded" });
        const pdf = await page.pdf();
        if (pdf.length < 5 || pdf.subarray(0, 5).toString() !== "%PDF-") throw new Error("PDF smoke output was invalid");
        await page.close();
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error("Chromium runtime smoke failed:", error.message);
    process.exit(1);
});
'

mkdir -p "${tmp_dir}/uploads" "${tmp_dir}/previews" "${tmp_dir}/logs"
printf 'non-secret license readability probe\n' > "${tmp_dir}/license.key"
chmod 0400 "${tmp_dir}/license.key"
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
    --user "$(id -u):$(id -g)" \
    --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 \
    --mount "type=bind,src=${tmp_dir}/uploads,dst=/server/uploads" \
    --mount "type=bind,src=${tmp_dir}/previews,dst=/server/previews" \
    --mount "type=bind,src=${tmp_dir}/logs,dst=/var/log" \
    --mount "type=bind,src=${tmp_dir}/license.key,dst=/server/license.key,readonly" \
    --entrypoint sh "${server_image}" -ec \
    'test -r /server/license.key && test ! -w /server/license.key && touch /server/uploads/probe /server/previews/probe /var/log/probe && mkdir -p /var/log/ai-chat-debug && chmod 0700 /var/log/ai-chat-debug && touch /var/log/ai-chat-debug/probe'

echo "Built images run unprivileged and can access correctly owned mounts"

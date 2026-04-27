import { NodeSSH } from 'node-ssh';
import axios from 'axios';
import { config } from '../config/index.js';

// ─── SSH to 1C server ───────────────────────────────────────────
export async function runSSHCommand(command) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: config.onec.serverHost,
    username: config.onec.sshUser,
    privateKeyPath: config.onec.sshKeyPath,
  });
  const result = await ssh.execCommand(command);
  ssh.dispose();
  if (result.code !== 0) {
    throw new Error(`SSH command failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

// ─── Create 1C infobase ──────────────────────────────────────────
export async function createInfobase({ infobaseName, cfTemplatePath }) {
  // 1. Create blank PostgreSQL DB
  await runSSHCommand(
    `sudo -u postgres createdb "${infobaseName}" --encoding=UTF8`
  );

  // 2. Create infobase via ibcmd
  await runSSHCommand(
    `ibcmd infobase create \
      --dbms=PostgreSQL \
      --db-server=localhost \
      --db-name="${infobaseName}" \
      --db-user=onec_db \
      --db-pwd="${process.env.ONEC_DB_PASSWORD}" \
      --cluster-user=cluster_admin \
      --cluster-pwd="${process.env.ONEC_CLUSTER_PASSWORD}" \
      --name="${infobaseName}" \
      --descr="Created by portal"`
  );

  // 3. Load configuration from CF template
  await runSSHCommand(
    `ibcmd infobase config load \
      --infobase="${infobaseName}" \
      --ibuser=Administrator \
      "${cfTemplatePath}"`
  );

  // 4. Publish via Apache (reload config)
  await runSSHCommand(`sudo systemctl reload apache2`);

  return `${config.onec.apacheBaseUrl}/${infobaseName}`;
}

// ─── Delete infobase ─────────────────────────────────────────────
export async function deleteInfobase(infobaseName) {
  await runSSHCommand(
    `ibcmd infobase drop \
      --infobase="${infobaseName}" \
      --cluster-user=cluster_admin \
      --cluster-pwd="${process.env.ONEC_CLUSTER_PASSWORD}" \
      --drop-database`
  );
}

// ─── Create backup (.dt file via ibcmd) ──────────────────────────
export async function createBackup({ infobaseName, destPath }) {
  await runSSHCommand(
    `ibcmd infobase dump \
      --infobase="${infobaseName}" \
      --ibuser=Administrator \
      "${destPath}"`
  );
}

// ─── REST API 1C: list users in infobase ─────────────────────────
function onecApiClient(infobaseName) {
  return axios.create({
    baseURL: `${config.onec.apacheBaseUrl}/${infobaseName}/odata/standard.odata`,
    auth: { username: config.onec.apiUser, password: config.onec.apiPass },
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });
}

export async function getInfobaseUsers(infobaseName) {
  const client = onecApiClient(infobaseName);
  const res = await client.get('/Catalog_Пользователи?$format=json');
  return res.data?.value || [];
}

export async function createInfobaseUser(infobaseName, { name, password, roles = [] }) {
  const client = onecApiClient(infobaseName);
  await client.post('/Catalog_Пользователи', {
    Description: name,
    Password: password,
    IBUserRoles: roles,
  });
}

export async function deleteInfobaseUser(infobaseName, userId) {
  const client = onecApiClient(infobaseName);
  await client.delete(`/Catalog_Пользователи(guid'${userId}')`);
}

// ─── Healthcheck: ping published 1C base ─────────────────────────
export async function healthcheckDatabase(apacheUrl) {
  const start = Date.now();
  try {
    await axios.get(`${apacheUrl}/e1cib/ping`, {
      timeout: 5000,
      auth: { username: config.onec.apiUser, password: config.onec.apiPass },
    });
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

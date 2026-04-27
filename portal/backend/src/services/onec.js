import axios from 'axios';
import { config } from '../config/index.js';

const getClient = (ibName) => axios.create({
  baseURL: `${config.onec.apacheBaseUrl}/${ibName}/odata/standard.odata`,
  auth: { username: config.onec.apiUser, password: config.onec.apiPass },
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const onec1cService = {
  async createUser(ibName, { name, login, password, roles }) {
    const client = getClient(ibName);
    const res = await client.post('/Catalog_Пользователи', {
      Description: name,
      IBUserID: '',
      Login: login,
      Password: password,
      Roles: roles,
    });
    return { uuid: res.data.Ref_Key };
  },

  async deactivateUser(ibName, login) {
    const client = getClient(ibName);
    const find = await client.get(`/Catalog_Пользователи?$filter=Login eq '${login}'&$select=Ref_Key`);
    const user = find.data.value?.[0];
    if (!user) throw new Error('User not found in 1C');
    await client.patch(`/Catalog_Пользователи(guid'${user.Ref_Key}')`, { DeletionMark: true });
  },

  async listUsers(ibName) {
    const client = getClient(ibName);
    const res = await client.get('/Catalog_Пользователи?$select=Ref_Key,Description,Login,DeletionMark');
    return res.data.value || [];
  },
};

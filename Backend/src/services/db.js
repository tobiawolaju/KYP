const { db } = require("./firebase");

function ref(collection) {
  return db.ref(collection);
}

async function getAll(collection) {
  const snapshot = await ref(collection).once("value");
  const val = snapshot.val();
  if (!val) return [];
  return Object.values(val);
}

async function getById(collection, id) {
  const snapshot = await ref(collection).child(id).once("value");
  return snapshot.val() || null;
}

async function insert(collection, record) {
  const id = record.id || require("crypto").randomUUID();
  record.id = id;
  await ref(collection).child(id).set(record);
  return record;
}

async function update(collection, id, fields) {
  await ref(collection).child(id).update(fields);
  const updated = await getById(collection, id);
  return updated;
}

async function query(collection, predicate) {
  const all = await getAll(collection);
  return all.filter(predicate);
}

async function remove(collection, id) {
  await ref(collection).child(id).remove();
}

async function removeWhere(collection, predicate) {
  const all = await getAll(collection);
  const toRemove = all.filter(predicate);
  for (const item of toRemove) {
    await ref(collection).child(item.id).remove();
  }
  return toRemove;
}

module.exports = { getAll, getById, insert, update, query, remove, removeWhere };

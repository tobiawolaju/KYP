const path = require("path");
const fs = require("fs");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/db.json");
const PROTOCOLS_SEED = require("../../data/protocols.json");

const adapter = new FileSync(DB_PATH);
const db = low(adapter);

db.defaults({ commitments: [], research: [], protocols: [], favorites: [] }).write();

if (db.get("protocols").size().value() === 0) {
  db.get("protocols").push(...PROTOCOLS_SEED).write();
  console.log("[DB] Seeded protocols from protocols.json:", PROTOCOLS_SEED.length, "records");
}

function getAll(collection) {
  return db.get(collection).value();
}

function getById(collection, id) {
  return db.get(collection).find({ id }).value();
}

function insert(collection, record) {
  db.get(collection).push(record).write();
  return record;
}

function update(collection, id, fields) {
  db.get(collection).find({ id }).assign(fields).write();
  return getById(collection, id);
}

function query(collection, predicate) {
  return db.get(collection).filter(predicate).value();
}

module.exports = { db, getAll, getById, insert, update, query };

import { connectDB } from './db.js';

export const storage = {
  async getCollection(name) {
    const db = await connectDB();
    return db.collection(name);
  },

  async getAllScans() {
    const col = await this.getCollection('scans');
    const scans = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return scans;
  },

  async getScan(id) {
    const col = await this.getCollection('scans');
    return await col.findOne({ id }, { projection: { _id: 0 } });
  },

  async saveScan(scan) {
    const col = await this.getCollection('scans');
    const now = new Date().toISOString();
    const doc = {
      ...scan,
      updatedAt: now,
    };
    await col.updateOne(
      { id: scan.id },
      { $set: doc },
      { upsert: true }
    );
    return doc;
  },

  async deleteScan(id) {
    const col = await this.getCollection('scans');
    const result = await col.deleteOne({ id });
    return result.deletedCount > 0;
  },

  async getAllSchedules() {
    const col = await this.getCollection('schedules');
    const schedules = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return schedules;
  },

  async saveSchedule(schedule) {
    const col = await this.getCollection('schedules');
    const now = new Date().toISOString();
    const doc = {
      ...schedule,
      updatedAt: now,
    };
    await col.updateOne(
      { id: schedule.id },
      { $set: doc },
      { upsert: true }
    );
    return doc;
  },

  async deleteSchedule(id) {
    const col = await this.getCollection('schedules');
    const result = await col.deleteOne({ id });
    return result.deletedCount > 0;
  },

  /**
   * Compare two completed scans to identify additions, disappearances, and attribute drift.
   */
  async compareScans(baseScanId, targetScanId) {
    const baseScan = await this.getScan(baseScanId);
    const targetScan = await this.getScan(targetScanId);

    if (!baseScan || !targetScan) {
      throw new Error('Both scans must exist to perform comparison.');
    }

    const baseCookies = baseScan.report?.cookies || [];
    const targetCookies = targetScan.report?.cookies || [];

    const baseMap = new Map();
    baseCookies.forEach(c => baseMap.set(`${c.name}|${c.domain}`, c));

    const targetMap = new Map();
    targetCookies.forEach(c => targetMap.set(`${c.name}|${c.domain}`, c));

    const newCookies = [];
    const notObservedCookies = [];
    const changedAttributes = [];
    const newlyUnclassified = [];

    // Detect additions and modifications in target compared to base
    for (const [key, targetCookie] of targetMap.entries()) {
      if (!baseMap.has(key)) {
        newCookies.push(targetCookie);
        if (targetCookie.category === 'unclassified' || targetCookie.classificationStatus === 'Review required') {
          newlyUnclassified.push(targetCookie);
        }
      } else {
        const baseCookie = baseMap.get(key);
        const changes = [];
        if (baseCookie.secure !== targetCookie.secure) {
          changes.push(`Secure flag changed from ${baseCookie.secure} to ${targetCookie.secure}`);
        }
        if (baseCookie.httpOnly !== targetCookie.httpOnly) {
          changes.push(`HttpOnly flag changed from ${baseCookie.httpOnly} to ${targetCookie.httpOnly}`);
        }
        if (baseCookie.sameSite !== targetCookie.sameSite) {
          changes.push(`SameSite changed from "${baseCookie.sameSite}" to "${targetCookie.sameSite}"`);
        }
        if (baseCookie.duration !== targetCookie.duration) {
          changes.push(`Duration changed from "${baseCookie.duration}" to "${targetCookie.duration}"`);
        }
        if (changes.length > 0) {
          changedAttributes.push({
            name: targetCookie.name,
            domain: targetCookie.domain,
            changes,
            previous: baseCookie,
            current: targetCookie,
          });
        }
      }
    }

    // Detect cookies not observed in target scan
    for (const [key, baseCookie] of baseMap.entries()) {
      if (!targetMap.has(key)) {
        notObservedCookies.push(baseCookie);
      }
    }

    // Third-party domains comparison
    const baseDomains = new Set(baseScan.report?.thirdPartyDomains || []);
    const targetDomains = new Set(targetScan.report?.thirdPartyDomains || []);
    const newDomains = [...targetDomains].filter(d => !baseDomains.has(d));
    const removedDomains = [...baseDomains].filter(d => !targetDomains.has(d));

    return {
      baseScan: {
        id: baseScan.id,
        url: baseScan.url,
        createdAt: baseScan.createdAt,
        cookieCount: baseCookies.length,
      },
      targetScan: {
        id: targetScan.id,
        url: targetScan.url,
        createdAt: targetScan.createdAt,
        cookieCount: targetCookies.length,
      },
      newCookies,
      notObservedCookies,
      changedAttributes,
      newlyUnclassified,
      domainChanges: {
        newDomains,
        removedDomains,
      },
    };
  },
};

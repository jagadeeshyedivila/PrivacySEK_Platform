import express from 'express';
import { connectDB } from '../db.js';
import {
  createDefaultBannerConfig,
} from '../../src/modules/cookies/cookieData.js';

export const cookieRouter = express.Router();

async function getCollection(name) {
  const db = await connectDB();
  return db.collection(name);
}

// -------------------------------------------------------------
// COMPREHENSIVE STATE INITIALIZER
// -------------------------------------------------------------
cookieRouter.get('/state', async (_req, res) => {
  try {
    const [
      cookiesCol,
      categoriesCol,
      bannerConfigsCol,
      bannerVersionsCol,
      tagsCol,
      consentRecordsCol,
      pageViewsCol,
    ] = await Promise.all([
      getCollection('cookies'),
      getCollection('cookie_categories'),
      getCollection('banner_configs'),
      getCollection('banner_versions'),
      getCollection('cookie_tags'),
      getCollection('consent_records'),
      getCollection('page_views'),
    ]);

    const [
      cookies,
      categories,
      bannerConfigs,
      versions,
      tags,
      consentRecords,
      pageViews,
    ] = await Promise.all([
      cookiesCol.find({}, { projection: { _id: 0 } }).sort({ lastDetected: -1 }).toArray(),
      categoriesCol.find({}, { projection: { _id: 0 } }).toArray(),
      bannerConfigsCol.find({}, { projection: { _id: 0 } }).toArray(),
      bannerVersionsCol.find({}, { projection: { _id: 0 } }).sort({ version: -1 }).toArray(),
      tagsCol.find({}, { projection: { _id: 0 } }).toArray(),
      consentRecordsCol.find({}, { projection: { _id: 0 } }).sort({ timestamp: -1 }).limit(1000).toArray(),
      pageViewsCol.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray(),
    ]);

    const draft = bannerConfigs.find(b => b.key === 'draft') || createDefaultBannerConfig();
    const published = bannerConfigs.find(b => b.key === 'published') || createDefaultBannerConfig();

    const blockedTags = tags.filter(t => t.status === 'Enabled');
    const availableTags = tags.filter(t => t.status !== 'Enabled');

    res.json({
      cookies,
      categories,
      draft,
      published,
      versions,
      blockedTags,
      availableTags,
      consentRecords,
      pageViews,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to load cookie consent state: ${err.message}` });
  }
});

// -------------------------------------------------------------
// COOKIE INVENTORY
// -------------------------------------------------------------
cookieRouter.get('/inventory', async (req, res) => {
  try {
    const col = await getCollection('cookies');
    const query = {};
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }
    if (req.query.party && req.query.party !== 'all') {
      query.party = req.query.party;
    }
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Determine sorting
    const sortBy = req.query.sortBy || 'lastDetected';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const total = await col.countDocuments(query);

    const isPaginated = req.query.page != null || req.query.pageSize != null || req.query.limit != null || req.query.paginate === 'true';

    if (isPaginated) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 10));
      const skip = (page - 1) * pageSize;
      const totalPages = Math.ceil(total / pageSize) || 1;

      const cookies = await col.find(query, { projection: { _id: 0 } })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .toArray();

      return res.json({
        success: true,
        cookies,
        total,
        page,
        pageSize,
        totalPages,
        pagination: {
          page,
          pageSize,
          totalRecords: total,
          totalPages,
        },
      });
    }

    const cookies = await col.find(query, { projection: { _id: 0 } }).sort(sort).toArray();
    res.json(cookies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.post('/inventory', async (req, res) => {
  try {
    const {
      name,
      domain = 'demo.privacysek.example',
      category = 'functional',
      party = 'First-party',
      provider = 'Custom',
      duration = 'Session',
      description = '',
      secure = true,
      httpOnly = false,
      sameSite = 'Lax',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Cookie name is required.' });
    }

    const col = await getCollection('cookies');
    const newCookie = {
      id: `cookie-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      domain: domain.trim(),
      category,
      party,
      provider: provider.trim(),
      duration,
      description,
      secure: Boolean(secure),
      httpOnly: Boolean(httpOnly),
      sameSite,
      classificationStatus: 'Reviewed',
      lastDetected: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await col.insertOne(newCookie);
    const { _id, ...clean } = newCookie;
    res.status(201).json(clean);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.get('/inventory/:id', async (req, res) => {
  try {
    const col = await getCollection('cookies');
    const cookie = await col.findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!cookie) return res.status(404).json({ error: 'Cookie not found.' });
    res.json(cookie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.put('/inventory/:id', async (req, res) => {
  try {
    const col = await getCollection('cookies');
    const { id, _id, ...updates } = req.body;
    updates.updatedAt = new Date().toISOString();

    const result = await col.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Cookie not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.delete('/inventory/:id', async (req, res) => {
  try {
    const col = await getCollection('cookies');
    const result = await col.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Cookie not found.' });
    res.json({ success: true, message: 'Cookie deleted from inventory.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BANNER CONFIGURATION & VERSIONS
// -------------------------------------------------------------
cookieRouter.get('/banner', async (_req, res) => {
  try {
    const col = await getCollection('banner_configs');
    const [draft, published] = await Promise.all([
      col.findOne({ key: 'draft' }, { projection: { _id: 0 } }),
      col.findOne({ key: 'published' }, { projection: { _id: 0 } }),
    ]);
    res.json({
      draft: draft || createDefaultBannerConfig(),
      published: published || createDefaultBannerConfig(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.put('/banner/draft', async (req, res) => {
  try {
    const col = await getCollection('banner_configs');
    const draftData = {
      ...req.body,
      key: 'draft',
      updatedAt: new Date().toISOString(),
    };
    delete draftData._id;

    await col.updateOne(
      { key: 'draft' },
      { $set: draftData },
      { upsert: true }
    );
    res.json({ success: true, draft: draftData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.post('/banner/publish', async (req, res) => {
  try {
    const bannerConfigsCol = await getCollection('banner_configs');
    const bannerVersionsCol = await getCollection('banner_versions');

    const draft = await bannerConfigsCol.findOne({ key: 'draft' }, { projection: { _id: 0 } });
    if (!draft) {
      return res.status(400).json({ error: 'No draft banner configuration found to publish.' });
    }

    // Determine next version number
    const latestVersion = await bannerVersionsCol.find({}, { projection: { version: 1 } })
      .sort({ version: -1 })
      .limit(1)
      .toArray();

    const nextVer = (latestVersion[0]?.version || 0) + 1;
    const now = new Date().toISOString();
    const publishedBy = req.body?.publishedBy || 'Security Lead (admin@privacysek.example)';
    const note = req.body?.note || `Published version ${nextVer} deployment`;

    const publishedConfig = {
      ...draft,
      key: 'published',
      updatedAt: now,
    };
    delete publishedConfig._id;

    const newVersion = {
      version: nextVer,
      publishedAt: now,
      publishedBy,
      note,
      config: { ...draft },
    };
    delete newVersion.config._id;
    delete newVersion.config.key;

    // Update published config and insert version history
    await Promise.all([
      bannerConfigsCol.updateOne({ key: 'published' }, { $set: publishedConfig }, { upsert: true }),
      bannerVersionsCol.insertOne(newVersion),
    ]);

    const { _id, ...cleanVersion } = newVersion;
    res.status(201).json({
      success: true,
      message: `Version ${nextVer} published successfully.`,
      published: publishedConfig,
      version: cleanVersion,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.get('/banner/versions', async (_req, res) => {
  try {
    const col = await getCollection('banner_versions');
    const versions = await col.find({}, { projection: { _id: 0 } }).sort({ version: -1 }).toArray();
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.post('/banner/reset', async (_req, res) => {
  try {
    const defaultBanner = createDefaultBannerConfig();
    const col = await getCollection('banner_configs');
    const now = new Date().toISOString();

    const draft = { ...defaultBanner, key: 'draft', updatedAt: now };
    const published = { ...defaultBanner, key: 'published', updatedAt: now };

    await Promise.all([
      col.updateOne({ key: 'draft' }, { $set: draft }, { upsert: true }),
      col.updateOne({ key: 'published' }, { $set: published }, { upsert: true }),
    ]);

    res.json({ success: true, draft, published });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BLOCKING RULES & TAGS
// -------------------------------------------------------------
cookieRouter.get('/tags', async (_req, res) => {
  try {
    const col = await getCollection('cookie_tags');
    const tags = await col.find({}, { projection: { _id: 0 } }).toArray();
    res.json({
      blockedTags: tags.filter(t => t.status === 'Enabled'),
      availableTags: tags.filter(t => t.status !== 'Enabled'),
      all: tags,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.post('/tags', async (req, res) => {
  try {
    const { name, host, category = 'analytics', status = 'Enabled' } = req.body;
    if (!name || !host) {
      return res.status(400).json({ error: 'Tag name and host are required.' });
    }

    const col = await getCollection('cookie_tags');
    const tag = {
      id: `tag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      host: host.trim(),
      source: `https://${host.trim()}/script.js`,
      type: 'JavaScript',
      category,
      status,
      lastDetected: new Date().toISOString().slice(0, 10),
      reason: `${category} tag rule configured in auto-blocking.`,
      updatedAt: new Date().toISOString(),
    };

    await col.insertOne(tag);
    const { _id, ...clean } = tag;
    res.status(201).json(clean);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.put('/tags/:id', async (req, res) => {
  try {
    const col = await getCollection('cookie_tags');
    const { id, _id, ...updates } = req.body;
    updates.updatedAt = new Date().toISOString();

    const result = await col.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Tag rule not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.delete('/tags/:id', async (req, res) => {
  try {
    const col = await getCollection('cookie_tags');
    const result = await col.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Tag not found.' });
    res.json({ success: true, message: 'Tag rule deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CONSENT RECORDS
// -------------------------------------------------------------
cookieRouter.get('/records', async (req, res) => {
  try {
    const col = await getCollection('consent_records');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { id: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { property: { $regex: search, $options: 'i' } },
        { device: { $regex: search, $options: 'i' } },
      ];
    }
    if (req.query.region && req.query.region !== 'all') {
      query.region = req.query.region;
    }
    if (req.query.action && req.query.action !== 'all') {
      query.action = req.query.action;
    }

    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const [total, records] = await Promise.all([
      col.countDocuments(query),
      col.find(query, { projection: { _id: 0 } }).sort(sort).skip(skip).limit(limit).toArray(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      records,
      total,
      page,
      limit,
      pageSize: limit,
      totalPages,
      pagination: {
        page,
        pageSize: limit,
        totalRecords: total,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

cookieRouter.post('/records', async (req, res) => {
  try {
    const {
      action = 'Choice recorded',
      categories = {},
      source = 'Consent banner',
      device = 'Desktop',
      region = 'EEA & UK',
      version = 1,
      property = 'demo.privacysek.example',
    } = req.body;

    const col = await getCollection('consent_records');
    const newRecord = {
      id: `receipt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      property,
      timestamp: new Date().toISOString(),
      action,
      categories: { ...categories, necessary: true },
      result: action === 'Close'
        ? 'No change'
        : (action === 'Disable All' || action === 'Reject All')
          ? 'Optional categories off'
          : 'Choice recorded',
      version: Number(version) || 1,
      source,
      device,
      region,
      createdAt: new Date().toISOString(),
    };

    await col.insertOne(newRecord);
    const { _id, ...clean } = newRecord;
    res.status(201).json(clean);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

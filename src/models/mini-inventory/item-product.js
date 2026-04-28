const BaseModel = require('restforgejs/src/models/base-model');
const db = require('restforgejs/src/utils/db');
const fs = require('fs');
const path = require('path');
// AdvancedFilterHelper dihapus — semua filtering ditangani oleh buildObjectFilterClause dan buildComplexWhereClause

/**
 * ItemProduct Model - Auto-generated on 2026-04-15 00:36:45
 *
 * Model untuk item-product yang mewarisi fungsi-fungsi dari BaseModel
 * Table: item_product
 * Fields: 18 fields
 * Database: PostgreSQL
 */
class ItemProductModel extends BaseModel {
  /**
   * Constructor
   */
  constructor() {
    // Definisikan validFields - semua field yang valid untuk tabel item-product
    const validFields = [
      'item_product_id',
      'product_code',
      'sku',
      'product_name',
      'category_id',
      'category_name',
      'brand',
      'description',
      'purchase_price',
      'selling_price',
      'stock',
      'min_stock',
      'uom',
      'weight',
      'is_active',
      'show_in_store',
      'barcode',
      'shelf_location'
    ];

    // Definisikan datatablesWhere sesuai payload
    const datatablesWhere = ["product_code","sku","product_name","all"];

    // Panggil constructor parent dengan nama tabel, validFields, dan datatablesWhere
    super('item_product', validFields, datatablesWhere);

    // Setup primary key dari payload atau fallback ke fieldName pertama
    this.primaryKey = 'item_product_id';

    // Setup viewName untuk operasi read jika berbeda dari tableName
    this.viewName = 'item_product';
    this.readSource = 'item_product'; // Source untuk operasi read (get, list, lookup, datatables)
    this.writeSource = 'item_product'; // Source untuk operasi write (add, update, delete)

    // Flag untuk self-documenting API (endpoint /info)
    this.hasViewQuery = true;
    this.hasExportQuery = false;

    // Load advanced query templates
    this.advancedQueryTemplates = this.loadAdvancedQueryTemplates();
    
    // Field validation configuration
    this.validationConfig = {
      'item_product_id': {
        type: 'uuid',
        constraints: {
            "primaryKey": true,
            "autoGenerate": true
      }
      },
      'product_code': {
        type: 'string',
        constraints: {
            "required": true,
            "maxLength": 20,
            "unique": true,
            "trim": true,
            "uppercase": true
      }
      },
      'selling_price': {
        type: 'number',
        constraints: {
            "required": false,
            "min": 0,
            "default": 0
      }
      },
      'stock': {
        type: 'number',
        constraints: {
            "required": true,
            "min": 0,
            "default": 0
      }
      },
      'min_stock': {
        type: 'number',
        constraints: {
            "required": false,
            "min": 0,
            "default": 0
      }
      },
      'weight': {
        type: 'number',
        constraints: {
            "required": false,
            "min": 0,
            "default": 0
      }
      },
      'uom': {
        type: 'string',
        constraints: {
            "required": false,
            "enum": [
                  "pcs",
                  "box",
                  "kg"
            ],
            "default": "pcs"
      }
      },
      'is_active': {
        type: 'boolean',
        constraints: {
            "required": false,
            "enum": [
                  "true",
                  "false"
            ],
            "default": "true"
      }
      },
      'show_in_store': {
        type: 'boolean',
        constraints: {
            "required": false,
            "enum": [
                  "true",
                  "false"
            ],
            "default": "true"
      }
      }
    };

    // Model metadata
    this.modelMetadata = {
      endpointName: 'item-product',
      moduleName: 'mini-inventory',
      tableName: 'item_product',
      viewName: 'item_product',
      fieldCount: 18,
      databaseType: 'postgres',
      generated: '2026-04-15 00:36:45',
      features: ["custom_where"]
    };
  }

  /**
   * Load advanced query templates dari file
   * @returns {Object} Templates SQL untuk advanced queries
   */
  loadAdvancedQueryTemplates() {
    const templates = {};
    // No advanced queries defined

    return templates;
  }

  /**
   * Override getListQuery untuk menyesuaikan dengan kebutuhan item-product
   * @param {Object} options - Query options
   * @returns {string} SQL query dasar untuk item-product
   */
  getListQuery(options = {}) {
    // Load query dasar dengan placeholder replacement
    
    // Load query dari file lokal
    let baseQuery;
    try {
      const queryFilePath = path.join(__dirname, 'query', 'item-product-datatables.sql');
      if (fs.existsSync(queryFilePath)) {
        baseQuery = fs.readFileSync(queryFilePath, 'utf8').trim();
      } else {
        throw new Error(`Query file not found: ${queryFilePath}`);
      }
    } catch (error) {
      throw new Error('Failed to load query file for datatablesQuery: ' + error.message);
    }

    // Replace any remaining placeholders - gunakan readSource untuk operasi read
    baseQuery = baseQuery.replace(/${tableName}/g, this.readSource);
    baseQuery = baseQuery.replace(/${this.table}/g, this.readSource);

    return baseQuery;
  }

  /**
   * Override getReadQuery untuk endpoint /read
   * Prioritas: viewName -> viewQuery -> tableName (SELECT * FROM readSource)
   * @param {Object} options - Query options
   * @returns {string} SQL query dasar untuk /read
   */
  getReadQuery(options = {}) {
    // Priority 1: viewName (real database view)
    if (this.viewName && this.viewName !== this.table) {
      return 'SELECT * FROM ' + this.viewName;
    }
    // Priority 2: viewQuery (virtual view dari payload)
    
    // Load query dari file lokal
    let baseQuery;
    try {
      const queryFilePath = path.join(__dirname, 'query', 'item-product-viewquery.sql');
      if (fs.existsSync(queryFilePath)) {
        baseQuery = fs.readFileSync(queryFilePath, 'utf8').trim();
      } else {
        throw new Error(`Query file not found: ${queryFilePath}`);
      }
    } catch (error) {
      throw new Error('Failed to load query file for viewQuery: ' + error.message);
    }

    // Replace any remaining placeholders
    baseQuery = baseQuery.replace(/\$\{tableName\}/g, this.readSource);
    baseQuery = baseQuery.replace(/\$\{this\.table\}/g, this.readSource);

    return baseQuery;
  }

  /**
   * Override getDatatables untuk mendukung filter object format
   * @param {Object} options - Parameter dari request
   * @returns {Object} Hasil query dengan format DataTables
   */
  async getDatatables(options) {
    try {
      // Check cache first (if enabled)
      const cachedResult = await this.getCachedDatatables(options);
      if (cachedResult) {
        return cachedResult;
      }

      const {
        searchValue = '',
        searchBy = 'all',
        perPage = 10,
        start = 0,
        sort_columns = [],
        filters = {},

        where = null
      } = options;

      // Resolve sort columns dengan prioritas: sort_columns > order[0][column] > default
      let resolvedSortColumns = sort_columns;

      // Fallback: cek format DataTables bawaan (order[0][column] dan order[0][dir])
      if ((!resolvedSortColumns || resolvedSortColumns.length === 0) &&
          options['order[0][column]'] !== undefined && options['order[0][dir]'] !== undefined) {
        const columnIndex = parseInt(options['order[0][column]']);
        const direction = options['order[0][dir]'];

        if (columnIndex >= 0 && columnIndex < this.validFields.length) {
          resolvedSortColumns = [{ column: this.validFields[columnIndex], direction: direction.toUpperCase() }];
        }
      }

      // 1. Mendapatkan query dasar
      const baseQuery = this.getListQuery(options);

      // 2. Membuat where clause berdasarkan search dan filter
      let whereClause = this.buildWhereClause(searchValue, searchBy);

      // 3. Tambahkan filter object jika ada
      const filterClause = this.buildObjectFilterClause(filters);

      if (filterClause) {
        if (whereClause) {
          whereClause += ' AND ' + filterClause;
        } else {
          whereClause = 'WHERE ' + filterClause;
        }
      }

      // 4. Proses parameter where dengan format advanced conditions
      let whereParams = [];
      if (where && (Array.isArray(where) || (where.conditions && Array.isArray(where.conditions)))) {
        try {
          let params = [];
          let paramIndex = 1;
          const whereResult = this.buildComplexWhereClause(where, params, paramIndex);
          if (whereResult.sql) {
            if (whereClause) {
              whereClause += ' AND (' + whereResult.sql + ')';
            } else {
              whereClause = 'WHERE ' + whereResult.sql;
            }
            whereParams = whereResult.params;
          }
        } catch (e) {
          const error = new Error('Invalid where conditions: ' + e.message);
          error.statusCode = 400;
          throw error;
        }
      }

      // Check if query needs subquery wrapping (CTE or JOIN)
      const isCteQuery = baseQuery.toLowerCase().trim().startsWith('with');
      const hasJoin = /\b(inner|left|right|cross|full)\s+join\b/i.test(baseQuery) || /\bjoin\b/i.test(baseQuery);
      const needsSubquery = isCteQuery || hasJoin;

      // 4. Menghitung total data keseluruhan - gunakan readSource untuk read operations
      const countTotalQuery = needsSubquery ?
        'SELECT COUNT(*) as total FROM (' + baseQuery + ') base_query' :
        'SELECT COUNT(*) as total FROM ' + this.readSource;
      const countTotalResult = await db.executeQuery(countTotalQuery);
      const totalRecords = countTotalResult && countTotalResult[0] ? parseInt(countTotalResult[0].total) : 0;

      // 5. Menghitung jumlah data terfilter - gunakan readSource untuk read operations
      let filteredRecords = totalRecords;
      if (whereClause) {
        // Always wrap CTE/JOIN query for counting with filters
        const countFilteredQuery = needsSubquery ?
          'SELECT COUNT(*) as total FROM (' + baseQuery + ') base_query ' + whereClause :
          'SELECT COUNT(*) as total FROM ' + this.readSource + ' ' + whereClause;
        console.log('Count Filtered Query:', countFilteredQuery);
        console.log('Count Filtered Parameters:', whereParams);
        const countFilteredResult = await db.executeQuery(countFilteredQuery, whereParams);
        filteredRecords = countFilteredResult && countFilteredResult[0] ? parseInt(countFilteredResult[0].total) : 0;
      }

      // 6. Membuat order clause menggunakan buildSortColumnsClause
      const orderClause = this.buildSortColumnsClause(resolvedSortColumns);

      // 7. Menambahkan pagination
      const limitClause = ` LIMIT ${perPage} OFFSET ${start}`;

      // 8. Menjalankan query final - wrap CTE/JOIN query to avoid column ambiguity
      const query = needsSubquery ?
        'SELECT * FROM (' + baseQuery + ') base_query ' + (whereClause || '') + orderClause + limitClause :
        baseQuery + " " + whereClause + orderClause + limitClause;
      console.log('Final Query:', query);
      console.log('Query Parameters:', whereParams);
      const data = await db.executeQuery(query, whereParams);

      const result = {
        draw: parseInt(options.draw || '1', 10),
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: data || []
      };

      // Cache the result (if enabled)
      await this.setCachedDatatables(options, result);

      return result;
    } catch (error) {
      console.error('Error in getDatatables:', error);
      throw error;
    }
  }

  /**
   * Get data list dengan manual pagination untuk endpoint /list
   * @param {Object} options - Parameter dari request list
   * @returns {Object} Hasil query dengan format list pagination
   */
  async getList(options) {
    try {
      const {
        page = null,
        perPage = 10,
        offset = 0,
        searchValue = '',
        searchBy = 'code',
        sort_columns = [],
        where = null,
        select = null,
        limit = 1000
      } = options;

      const paginate = page !== null;

      // Cache: Check if data exists in cache
      const scInfo = sort_columns && sort_columns.length > 0
        ? sort_columns.map(s => `${s.column}:${s.direction}`).join(',')
        : 'default';
      const cacheInfo = `page:${page}, perPage:${perPage}, sort:${scInfo}, search:${searchValue || 'none'}${where ? ', where:yes' : ''}`;
      const cachedResult = await this.getCachedList(options);
      if (cachedResult) {
        console.log(`[Cache] HIT for list - ${cacheInfo}`);
        return cachedResult;
      }
      console.log(`[Cache] MISS for list - ${cacheInfo}`);

      // 1. Mendapatkan query dasar
      let baseQuery;
      if (select && Array.isArray(select) && select.length > 0) {
        const selectedValidColumns = select.filter(col => this.validFields.includes(col));
        if (selectedValidColumns.length > 0) {
          baseQuery = 'SELECT ' + selectedValidColumns.join(', ') + ' FROM ' + this.readSource;
        } else {
          baseQuery = 'SELECT * FROM ' + this.readSource;
        }
      } else {
        baseQuery = this.getReadQuery(options);
      }

      // 1b. Deteksi apakah query mengandung JOIN atau CTE (perlu subquery wrapping)
      const isCteQuery = baseQuery.toLowerCase().trim().startsWith('with');
      const hasJoin = /\b(inner|left|right|cross|full)\s+join\b/i.test(baseQuery) || /\bjoin\b/i.test(baseQuery);
      const needsSubquery = isCteQuery || hasJoin;

      // 2. Build WHERE clause untuk search
      let whereClause = '';
      if (searchValue && searchValue.trim() !== '') {
        const escapedSearchValue = searchValue.replace(/'/g, "''");
        const likeValue = `%${escapedSearchValue}%`;
        whereClause = `WHERE UPPER(${searchBy}) LIKE UPPER('${likeValue}')`;
      }

      // 3. Proses parameter where dengan format advanced conditions
      let whereParams = [];
      if (where && (Array.isArray(where) || (where.conditions && Array.isArray(where.conditions)))) {
        try {
          let params = [];
          let paramIndex = 1;
          const whereResult = this.buildComplexWhereClause(where, params, paramIndex);
          if (whereResult.sql) {
            if (whereClause) {
              whereClause += ' AND (' + whereResult.sql + ')';
            } else {
              whereClause = 'WHERE ' + whereResult.sql;
            }
            whereParams = whereResult.params;
          }
        } catch (e) {
          const error = new Error('Invalid where conditions: ' + e.message);
          error.statusCode = 400;
          throw error;
        }
      }

      // 4. Menghitung total data keseluruhan (tanpa filter)
      const countTotalQuery = needsSubquery
        ? 'SELECT COUNT(*) as total FROM (' + baseQuery + ') base_query'
        : 'SELECT COUNT(*) as total FROM ' + this.readSource;
      const countTotalResult = await db.executeQuery(countTotalQuery);
      const totalRecords = countTotalResult && countTotalResult[0] ? parseInt(countTotalResult[0].total) : 0;

      // 5. Menghitung jumlah data terfilter (jika ada where/search)
      let filteredRecords = totalRecords;
      if (whereClause) {
        const countFilteredQuery = needsSubquery
          ? 'SELECT COUNT(*) as total FROM (' + baseQuery + ') base_query ' + whereClause
          : 'SELECT COUNT(*) as total FROM ' + this.readSource + ' ' + whereClause;
        const countFilteredResult = await db.executeQuery(countFilteredQuery, whereParams.length > 0 ? whereParams : undefined);
        filteredRecords = countFilteredResult && countFilteredResult[0] ? parseInt(countFilteredResult[0].total) : 0;
      }

      // 6. Build ORDER BY clause
      const orderClause = this.buildSortColumnsClause(sort_columns);

      // 7. Build LIMIT dan OFFSET clause (kondisional berdasarkan mode)
      let limitClause;
      if (paginate) {
        limitClause = ` LIMIT ${perPage} OFFSET ${offset}`;
      } else {
        limitClause = ` LIMIT ${limit}`;
      }

      // 8. Menjalankan query final untuk data (subquery wrapping untuk JOIN/CTE)
      const query = needsSubquery
        ? 'SELECT * FROM (' + baseQuery + ') base_query ' + whereClause + orderClause + limitClause
        : baseQuery + ' ' + whereClause + orderClause + limitClause;
      console.log(`List SQL Query: ${query}`);
      console.log('List Query Parameters:', whereParams);
      const data = await db.executeQuery(query, whereParams.length > 0 ? whereParams : undefined);

      const result = {
        data: data || [],
        totalRecords: filteredRecords,
        totalUnfiltered: totalRecords
      };

      if (paginate) {
        result.page = page;
        result.perPage = perPage;
      }

      // Cache: Store result in cache
      await this.setCachedList(options, result);
      console.log(`[Cache] SET for list - ${cacheInfo}`);

      return result;
    } catch (error) {
      console.error('Error in getList:', error);
      throw error;
    }
  }

  /**
   * Membangun WHERE clause dari filter object
   * @param {Object} filters - Object filter dengan format {column: value}
   * @returns {string} WHERE clause SQL atau empty string
   */
  buildObjectFilterClause(filters) {
    if (!filters || typeof filters !== 'object' || Object.keys(filters).length === 0) {
      return '';
    }

    const conditions = [];

    for (const [column, value] of Object.entries(filters)) {
      // Validasi kolom harus ada dalam validFields
      if (this.validFields.includes(column) && value !== null && value !== undefined && value !== '') {
        // Escape value untuk mencegah SQL injection
        const escapedValue = value.toString().replace(/'/g, "''");
        conditions.push(`${column} = '${escapedValue}'`);
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }






  /**
   * Mendapatkan FROM clause untuk lookup berdasarkan prioritas resolusi sumber data
   * Prioritas: viewName → viewQuery → tableName (konsisten dengan /read dan /first)
   * @returns {string} FROM clause dengan alias 'a'
   */
  getLookupSource() {
    const readQuery = this.getReadQuery();
    const simpleQuery = 'SELECT * FROM ' + this.readSource;
    if (readQuery.trim() !== simpleQuery) {
      // viewName atau viewQuery aktif — bungkus sebagai subquery
      return '(' + readQuery + ') a';
    }
    return this.readSource + ' a';
  }

  /**
   * Override getLookupData untuk menggunakan kolom 'item_product_id' yang benar
   * @param {string} search - Kata kunci pencarian
   * @returns {Array} Array objek hasil lookup
   */
  async getLookupData(search) {
    try {
      const query = 'SELECT item_product_id, item_product_id FROM ' + this.getLookupSource() + ' WHERE upper(a.item_product_id) LIKE upper($1) ORDER BY a.item_product_id';

      const params = [`%${search || ''}%`];

      const data = await db.executeQuery(query, params);

      const result = data.map(item => ({
        id: item.item_product_id,
        text: item.item_product_id
      }));

      return result;
    } catch (error) {
      console.error('Error in getLookupData (ItemProductModel):', error);
      throw error;
    }
  }

  /**
   * Dynamic lookup dengan support filtering tambahan dan pencarian multi-field
   * @param {string} search - Kata kunci pencarian
   * @param {Object} extraFilters - Filter tambahan (misal: company_id)
   * @returns {Array} Array objek hasil lookup
   */
  async getLookupDataDynamic(search, extraFilters = {}) {
    try {
      // Gunakan custom lookup config jika ada, fallback ke textFields detection
      const lookupConfig = {"idField":"item_product_id","textField":"product_name","hasCustomText":false,"searchFields":["product_name"]};
      const textFields = lookupConfig && lookupConfig.searchFields.length > 0
        ? lookupConfig.searchFields
        : ["product_code","product_name","category_name","barcode"];

      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Add search conditions untuk text fields
      if (search && search.trim()) {
        const searchConditions = textFields.map(field => {
          return `upper(a.${field}) LIKE upper($${paramIndex++})`;
        });
        whereConditions.push(`(${searchConditions.join(' OR ')})`);

        // Add search parameter for each text field
        textFields.forEach(() => {
          params.push(`%${search.trim()}%`);
        });
      }

      // Add extra filters
      for (const [key, value] of Object.entries(extraFilters)) {
        if (value && ["item_product_id","product_code","sku","product_name","category_id","category_name","brand","description","purchase_price","selling_price","stock","min_stock","uom","weight","is_active","show_in_store","barcode","shelf_location"].includes(key)) {
          whereConditions.push(`a.${key} = $${paramIndex++}`);
          params.push(value);
        }
      }

      // Build final query - gunakan custom select jika ada
      const idField = lookupConfig ? lookupConfig.idField : 'item_product_id';
      const textField = lookupConfig && lookupConfig.hasCustomText
        ? lookupConfig.textField
        : textFields[0];

      let query = `SELECT ${idField}, ${textField} FROM ${this.getLookupSource()}`;
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      query += ` ORDER BY ${lookupConfig && lookupConfig.hasCustomText ? '2' : 'a.' + textFields[0]}`;

      console.log('=== DEBUG DYNAMIC LOOKUP ===');
      console.log('Query:', query);
      console.log('Params:', params);
      console.log('Extra filters:', extraFilters);
      console.log('Lookup config:', lookupConfig);
      console.log('=== END DEBUG ===');

      const data = await db.executeQuery(query, params);

      return data.map(item => ({
        id: item[idField] || item.item_product_id,
        text: item[lookupConfig && lookupConfig.hasCustomText ? 'display_text' : textFields[0]] || ''
      }));
    } catch (error) {
      console.error('Error in getLookupDataDynamic (ItemProductModel):', error);
      throw error;
    }
  }

  /**
   * Override getStaticLookupData untuk menggunakan kolom 'item_product_id' yang benar
   * @param {string} selectedTag - ID yang dipilih
   * @returns {Array} Array objek hasil lookup
   */
  async getStaticLookupData(selectedTag) {
    try {
      // Check cache first (if enabled) - cache tanpa selectedTag karena data sama
      const cacheOptions = { type: 'static' };
      const cachedResult = await this.getCachedLookup(cacheOptions, 'static');
      if (cachedResult) {
        // Apply selectedTag to cached result
        return cachedResult.map(item => {
          if (item.id === selectedTag) {
            return { ...item, selected: 'true' };
          }
          return { id: item.id, text: item.text };
        });
      }

      const query = 'SELECT item_product_id, item_product_id FROM ' + this.getLookupSource() + ' ORDER BY a.item_product_id';

      const data = await db.executeQuery(query);

      // Cache result tanpa selected flag
      const cacheData = data.map(item => ({
        id: item.item_product_id,
        text: item.item_product_id
      }));
      await this.setCachedLookup(cacheOptions, cacheData, 'static');

      // Return dengan selected flag
      return data.map(item => {
        const result = {
          id: item.item_product_id,
          text: item.item_product_id
        };

        if (item.item_product_id === selectedTag) {
          result.selected = 'true';
        }

        return result;
      });
    } catch (error) {
      console.error('Error in getStaticLookupData (ItemProductModel):', error);
      throw error;
    }
  }

  /**
   * Method untuk lookup data dengan filtering (where clause) dan custom select
   * @param {Object} options - Options dengan where dan select
   * @returns {Array} Array objek hasil lookup dengan format {id, text}
   */
  async getLookupDataWithFilter(options) {
    try {
      // Check cache first (if enabled)
      const cacheOptions = { ...options, type: 'filter' };
      const cachedResult = await this.getCachedLookup(cacheOptions, 'filter');
      if (cachedResult) {
        return cachedResult;
      }

      const selectColumns = options.select || ['item_product_id', 'item_product_id'];
      let params = [];
      let paramIndex = 1;

      // Parse dan validasi select columns untuk support SQL expressions
      const validTextFields = ["product_code","product_name","category_name","barcode"];
      let selectClause = 'item_product_id';
      let textField = 'item_product_id';
      let aliasField = null;

      // Proses setiap column dalam select
      for (const column of selectColumns) {
        if (column.toLowerCase() === 'item_product_id'.toLowerCase()) {
          continue; // primary key sudah ada
        }

        // Check jika ada SQL expression dengan alias (menggunakan AS)
        const aliasRegex = new RegExp('(.+)\\s+as\\s+(\\w+)$', 'i');
        const aliasMatch = column.match(aliasRegex);
        if (aliasMatch) {
          const expression = aliasMatch[1].trim();
          const alias = aliasMatch[2].trim();
          selectClause += `, ${expression} AS ${alias}`;
          textField = alias;
          aliasField = alias;
          break; // gunakan yang pertama sebagai text field
        }

        // Check jika simple field name
        if (validTextFields.includes(column) || column === 'item_product_id') {
          selectClause += `, ${column}`;
          textField = column;
          break; // gunakan yang pertama sebagai text field
        }

        // Jika bukan recognized field, masih tambahkan (mungkin computed column)
        selectClause += `, ${column}`;
        textField = column;
      }

      // Bangun query SELECT dengan support expressions
      let query = `SELECT ${selectClause} FROM ${this.getLookupSource()} `;

      // Bangun WHERE clause jika ada dan tidak kosong
      if ((options.where && Array.isArray(options.where) && options.where.length > 0) ||
          (options.where && options.where.conditions && Array.isArray(options.where.conditions) && options.where.conditions.length > 0)) {
        try {
          const whereResult = this.buildComplexWhereClause(options.where, params, paramIndex);
          query += `WHERE ${whereResult.sql} `;
          params = whereResult.params;
        } catch (e) {
          const error = new Error('Invalid where conditions: ' + e.message);
          error.statusCode = 400;
          throw error;
        }
      }

      // Handle sort_columns jika ada
      if (options.sort_columns && Array.isArray(options.sort_columns) && options.sort_columns.length > 0) {
        const orderParts = options.sort_columns.map(item => {
          const column = item.column;
          const direction = (item.direction || 'ASC').toUpperCase();
          if (!column) return null;
          if (!this.validFields.includes(column) && column !== 'item_product_id') return null;
          if (direction !== 'ASC' && direction !== 'DESC') return null;
          return `${column} ${direction}`;
        }).filter(Boolean);

        if (orderParts.length === 0) {
          const error = new Error('No valid sort columns provided');
          error.statusCode = 400;
          throw error;
        }
        query += `ORDER BY ${orderParts.join(', ')}`;
      } else {
        // Order by text field (gunakan alias jika ada) - default behavior
        query += `ORDER BY ${aliasField || textField}`;
      }

      console.log('=== DEBUG ITEM-PRODUCT LOOKUP WITH FILTER ===');
      console.log('Final SQL:', query);
      console.log('Parameters:', params);
      console.log('Selected columns:', selectColumns);
      console.log('Sort columns:', options.sort_columns || 'none');
      console.log('Valid fields for ordering:', this.validFields);
      console.log('Text field:', textField);
      console.log('Alias field:', aliasField);
      console.log('=== END DEBUG ===');

      // Eksekusi query
      const data = await db.executeQuery(query, params);

      // Format hasil untuk lookup (id dan text) - gunakan alias jika ada
      const textFieldName = aliasField || textField;
      const result = data.map(item => ({
        id: item.item_product_id,
        text: item[textFieldName] || item.item_product_id || item.name || item.code || item.description || ''
      }));

      // Cache the result (if enabled)
      await this.setCachedLookup(cacheOptions, result, 'filter');

      return result;

    } catch (error) {
      console.error('Error in getLookupDataWithFilter (ItemProductModel):', error);
      throw error;
    }
  }


  /**
   * Get field mapping untuk berbagai operasi
   * @returns {Object} Field mapping object
   */
  getFieldMapping() {
    return {
      allFields: this.validFields,
      textFields: ["product_code","product_name","category_name","barcode"],
      dateFields: [],
      requiredFields: ["product_code","product_name","category_name","barcode"],
      primaryTextField: 'item_product_id',
      searchableFields: this.getSearchableColumns ? this.getSearchableColumns().map(col => col.name) : []
    };
  }

  /**
   * Override formatResponseData untuk item-product
   * @param {Object} data - Data dari database
   * @returns {Object} Data yang sudah diformat untuk response item-product
   */
  formatResponseData(data) {
    // Gunakan parent method yang sudah include datetime formatting
    return super.formatResponseData(data);
  }

  /**
   * Execute advanced query berdasarkan nama
   * @param {string} queryName - Nama query dari advancedQueryTemplates
   * @param {Object} params - Parameter untuk query
   * @returns {Array} Hasil query
   */
  async executeAdvancedQuery(queryName, params = {}) {
    if (!this.advancedQueryTemplates[queryName]) {
      throw new Error(`Advanced query '${queryName}' not found. Available queries: ${Object.keys(this.advancedQueryTemplates).join(', ')}`);
    }

    try {
      let query = this.advancedQueryTemplates[queryName];

      // Replace placeholders
      query = query.replace(/${tableName}/g, this.table);
      query = query.replace(/${this.table}/g, this.table);

      // Replace parameter placeholders
      for (const [key, value] of Object.entries(params)) {
        const placeholder = new RegExp(`\$\{params\\.${key}\}`, 'g');
        query = query.replace(placeholder, value);
      }

      console.log(`Executing advanced query '${queryName}': ${query}`);

      const result = await db.executeQuery(query);
      return result;
    } catch (error) {
      console.error(`Error executing advanced query '${queryName}':`, error);
      throw error;
    }
  }

  /**
   * Validate data before insert/update operations
   * @param {Object} data - Data yang akan divalidasi
   * @param {string} operation - Operasi (insert/update)
   * @returns {Object} Validation result
   */
  async validateData(data, operation = 'insert') {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedData: {}
    };

    try {
      // Check if we have fieldValidation config
      const hasFieldValidation = this.validationConfig && Object.keys(this.validationConfig).length > 0;

      if (hasFieldValidation) {
        // Loop semua field yang ada di validationConfig
        for (const fieldName in this.validationConfig) {
          let value = data[fieldName];
          const config = this.validationConfig[fieldName];
          const constraints = config.constraints || {};

          // Auto-generate value jika autoGenerate dan nilai kosong
          if (operation === 'insert' && constraints.autoGenerate && (!value || value === '')) {
            if (config.type === 'uuid') {
              const { v4: uuidv4 } = require('uuid');
              value = uuidv4();
              data[fieldName] = value; // Update data asli juga
            } else if (config.type === 'timestamp' || config.type === 'datetime') {
              value = new Date().toISOString();
              data[fieldName] = value; // Update data asli juga
            } else if (config.type === 'date') {
              value = new Date().toISOString().split('T')[0];
              data[fieldName] = value; // Update data asli juga
            }
          }

          // Validate per-field dengan constraints
          const fieldResult = await this.validateFieldConstraints(fieldName, value, operation);

          // Accumulate errors
          if (!fieldResult.valid) {
            result.isValid = false;
            result.errors.push(...fieldResult.errors);
          }

          // Accumulate warnings
          if (fieldResult.warnings && fieldResult.warnings.length > 0) {
            result.warnings.push(...fieldResult.warnings);
          }

          // Set sanitized value
          if (fieldResult.sanitized !== undefined) {
            result.sanitizedData[fieldName] = fieldResult.sanitized;
          }
        }

        // Validate field yang tidak ada di validationConfig (backward compatibility)
        for (const field of this.validFields) {
          if (!this.validationConfig[field] && data[field] !== undefined) {
            // Fallback ke generic sanitization
            result.sanitizedData[field] = this.sanitizeFieldValue(field, data[field]);
          }
        }

        // Cross-field validation (contoh: before/after date)
        if (result.isValid) {
          const crossFieldResult = await this._validateCrossFieldConstraints(result.sanitizedData, operation);
          if (!crossFieldResult.valid) {
            result.isValid = false;
            result.errors.push(...crossFieldResult.errors);
          }
        }

      } else {
        // Fallback: Tidak ada fieldValidation - gunakan generic validation
        for (const field of this.validFields) {
          const value = data[field];

          // Required field validation untuk insert
          if (operation === 'insert' && (field === 'id' || field === 'name' || field === 'nama')) {
            if (value === undefined || value === null || value === '') {
              if (field !== 'id') { // ID bisa auto-generated
                result.errors.push(`Field '${field}' is required for ${operation} operation`);
                result.isValid = false;
              }
            }
          }

          // Sanitize dan validate value jika ada
          if (value !== undefined && value !== null) {
            result.sanitizedData[field] = this.sanitizeFieldValue(field, value);
          }
        }

        // Generic email validation
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          result.errors.push('Invalid email format');
          result.isValid = false;
        }
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Sanitize field value berdasarkan tipe field (generic fallback)
   * @param {string} fieldName - Nama field
   * @param {*} value - Nilai field
   * @returns {*} Sanitized value
   */
  sanitizeFieldValue(fieldName, value) {
    if (typeof value === 'string') {
      // Trim whitespace
      value = value.trim();

      // Escape special characters untuk mencegah injection
      value = value.replace(/[<>]/g, '');

      // Truncate jika terlalu panjang
      if (value.length > 255) {
        value = value.substring(0, 255);
      }
    }

    return value;
  }

  /**
   * Validate field dengan constraints
   * @param {string} fieldName - Nama field
   * @param {*} value - Nilai field
   * @param {string} operation - Operation (insert/update)
   * @returns {Object} Validation result {valid, errors, warnings, sanitized}
   */
  async validateFieldConstraints(fieldName, value, operation = 'insert') {
    const config = this.validationConfig[fieldName];
    if (!config) {
      return {valid: true, sanitized: value, errors: [], warnings: []};
    }

    const result = {
      valid: true,
      errors: [],
      warnings: [],
      sanitized: value
    };

    const constraints = config.constraints || {};
    const fieldType = config.type || 'string';

    // 1. Check required
    if (constraints.required && (value === undefined || value === null || value === '')) {
      // Skip: autoGenerate atau primaryKey di insert
      if (operation === 'insert' && (constraints.autoGenerate || constraints.primaryKey)) {
        // OK — akan di-generate otomatis
      }
      // Skip: update partial — field tidak dikirim berarti tidak diubah
      else if (operation === 'update' && value === undefined) {
        // OK — field tidak sedang di-update
      }
      else {
        const message = constraints.requiredMessage || `Field '${fieldName}' is required`;
        result.errors.push(message);
        result.valid = false;
        return result;
      }
    }

    // Skip validation jika value kosong dan tidak required
    if (value === undefined || value === null || value === '') {
      return result;
    }

    // 2. Type-specific validation
    switch (fieldType) {
      case 'string':
        return await this._validateStringConstraints(fieldName, value, constraints);
      case 'integer':
      case 'decimal':
      case 'number':
        return this._validateNumberConstraints(fieldName, value, constraints);
      case 'date':
      case 'datetime':
      case 'timestamp':
      case 'time':
        return this._validateDateConstraints(fieldName, value, constraints);
      case 'boolean':
        return this._validateBooleanConstraints(fieldName, value, constraints);
      case 'uuid':
        return this._validateUuidConstraints(fieldName, value, constraints);
      case 'array':
        return this._validateArrayConstraints(fieldName, value, constraints);
      case 'json':
        return this._validateJsonConstraints(fieldName, value, constraints);
      default:
        return result;
    }
  }

  /**
   * Validate string constraints
   */
  async _validateStringConstraints(fieldName, value, constraints) {
    let sanitized = String(value);
    const errors = [];
    const isHashField = constraints.hash === 'bcrypt';

    // Trim
    if (constraints.trim) {
      sanitized = sanitized.trim();
    }

    // Case transformation (skip jika hash field — tidak relevan untuk password)
    if (!isHashField) {
      if (constraints.lowercase) {
        sanitized = sanitized.toLowerCase();
      } else if (constraints.uppercase) {
        sanitized = sanitized.toUpperCase();
      }
    }

    // Length validation (validasi plaintext sebelum hash)
    if (constraints.minLength && sanitized.length < constraints.minLength) {
      const message = constraints.minLengthMessage || `Field '${fieldName}' must be at least ${constraints.minLength} characters`;
      errors.push(message);
    }
    if (constraints.maxLength && !isHashField && sanitized.length > constraints.maxLength) {
      const message = constraints.maxLengthMessage || `Field '${fieldName}' must not exceed ${constraints.maxLength} characters`;
      errors.push(message);
    }

    // Pattern validation (validasi plaintext sebelum hash)
    if (constraints.pattern) {
      const regex = new RegExp(constraints.pattern);
      if (!regex.test(sanitized)) {
        const message = constraints.patternMessage || `Field '${fieldName}' does not match required pattern`;
        errors.push(message);
      }
    }

    // Format validation (email, phone, url, uuid)
    if (constraints.format) {
      const formatValid = this._validateFormat(sanitized, constraints.format);
      if (!formatValid.valid) {
        const message = constraints.formatMessage || `Field '${fieldName}' has invalid ${constraints.format} format`;
        errors.push(message);
      }
    }

    // Enum validation
    if (constraints.enum && Array.isArray(constraints.enum)) {
      if (!constraints.enum.includes(sanitized)) {
        const message = constraints.enumMessage || `Field '${fieldName}' must be one of: ${constraints.enum.join(', ')}`;
        errors.push(message);
      }
    }

    // Skip unique constraint - database akan handle via UNIQUE index
    // if (constraints.unique) { /* handled by database */ }

    // Hash transformation (setelah semua validation pass, sebelum return)
    if (isHashField && errors.length === 0) {
      const bcrypt = require('bcrypt');
      const cost = constraints.hashCost || 10;
      sanitized = await bcrypt.hash(sanitized, cost);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: sanitized
    };
  }

  /**
   * Validate number constraints
   */
  _validateNumberConstraints(fieldName, value, constraints) {
    let sanitized = value;
    const errors = [];

    // Parse to number
    if (typeof sanitized === 'string') {
      sanitized = parseFloat(sanitized);
    }

    if (isNaN(sanitized)) {
      errors.push(`Field '${fieldName}' must be a valid number`);
      return {valid: false, errors: errors, warnings: [], sanitized: value};
    }

    // Min/Max
    if (constraints.min !== undefined && sanitized < constraints.min) {
      const message = constraints.minMessage || `Field '${fieldName}' must be at least ${constraints.min}`;
      errors.push(message);
    }
    if (constraints.max !== undefined && sanitized > constraints.max) {
      const message = constraints.maxMessage || `Field '${fieldName}' must not exceed ${constraints.max}`;
      errors.push(message);
    }

    // Positive/Negative
    if (constraints.positive && sanitized <= 0) {
      const message = constraints.positiveMessage || `Field '${fieldName}' must be positive`;
      errors.push(message);
    }
    if (constraints.negative && sanitized >= 0) {
      const message = constraints.negativeMessage || `Field '${fieldName}' must be negative`;
      errors.push(message);
    }

    // Integer check
    if (constraints.integer && !Number.isInteger(sanitized)) {
      const message = constraints.integerMessage || `Field '${fieldName}' must be an integer`;
      errors.push(message);
    }

    // Precision/Scale for decimal
    if (constraints.precision !== undefined) {
      const decimals = (sanitized.toString().split('.')[1] || '').length;
      if (decimals > constraints.precision) {
        const message = constraints.precisionMessage || `Field '${fieldName}' must have at most ${constraints.precision} decimal places`;
        errors.push(message);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: sanitized
    };
  }

  /**
   * Validate date constraints
   */
  _validateDateConstraints(fieldName, value, constraints) {
    const errors = [];
    let sanitized = value;

    // Basic date validation (more complex parsing handled by DateTimeParser in basemodel)
    // Min/Max date range
    if (constraints.min || constraints.max) {
      try {
        const dateValue = new Date(sanitized);
        if (isNaN(dateValue.getTime())) {
          errors.push(`Field '${fieldName}' must be a valid date`);
        } else {
          if (constraints.min) {
            const minDate = new Date(constraints.min);
            if (dateValue < minDate) {
              const message = constraints.minMessage || `Field '${fieldName}' must be on or after ${constraints.min}`;
              errors.push(message);
            }
          }
          if (constraints.max) {
            const maxDate = new Date(constraints.max);
            if (dateValue > maxDate) {
              const message = constraints.maxMessage || `Field '${fieldName}' must be on or before ${constraints.max}`;
              errors.push(message);
            }
          }
        }
      } catch (e) {
        errors.push(`Field '${fieldName}' must be a valid date`);
      }
    }

    // Before/After relasi akan divalidasi di _validateCrossFieldConstraints

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: sanitized
    };
  }

  /**
   * Validate boolean constraints
   */
  _validateBooleanConstraints(fieldName, value, constraints) {
    const errors = [];
    let sanitized = value;

    if (constraints.strict) {
      if (typeof sanitized !== 'boolean') {
        errors.push(`Field '${fieldName}' must be a boolean (true/false)`);
      }
    } else {
      // Convert truthy/falsy
      if (sanitized === 'true' || sanitized === '1' || sanitized === 1) {
        sanitized = true;
      } else if (sanitized === 'false' || sanitized === '0' || sanitized === 0) {
        sanitized = false;
      } else if (typeof sanitized !== 'boolean') {
        sanitized = Boolean(sanitized);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: sanitized
    };
  }

  /**
   * Validate UUID constraints
   */
  _validateUuidConstraints(fieldName, value, constraints) {
    const errors = [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      const message = constraints.formatMessage || `Field '${fieldName}' must be a valid UUID`;
      errors.push(message);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: value
    };
  }

  /**
   * Validate array constraints
   */
  _validateArrayConstraints(fieldName, value, constraints) {
    const errors = [];

    if (!Array.isArray(value)) {
      errors.push(`Field '${fieldName}' must be an array`);
      return {valid: false, errors: errors, warnings: [], sanitized: value};
    }

    // minItems/maxItems
    if (constraints.minItems && value.length < constraints.minItems) {
      const message = constraints.minItemsMessage || `Field '${fieldName}' must have at least ${constraints.minItems} items`;
      errors.push(message);
    }
    if (constraints.maxItems && value.length > constraints.maxItems) {
      const message = constraints.maxItemsMessage || `Field '${fieldName}' must not exceed ${constraints.maxItems} items`;
      errors.push(message);
    }

    // uniqueItems
    if (constraints.uniqueItems) {
      const unique = [...new Set(value)];
      if (unique.length !== value.length) {
        const message = constraints.uniqueItemsMessage || `Field '${fieldName}' must have unique items`;
        errors.push(message);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: value
    };
  }

  /**
   * Validate JSON constraints
   */
  _validateJsonConstraints(fieldName, value, constraints) {
    const errors = [];
    let sanitized = value;

    // Parse jika string
    if (typeof sanitized === 'string') {
      try {
        sanitized = JSON.parse(sanitized);
      } catch (e) {
        errors.push(`Field '${fieldName}' must be valid JSON`);
        return {valid: false, errors: errors, warnings: [], sanitized: value};
      }
    }

    // JSON Schema validation bisa ditambahkan di sini jika diperlukan

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      sanitized: sanitized
    };
  }

  /**
   * Validate format (email, phone, url, uuid)
   */
  _validateFormat(value, format) {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\d\s\-\+\(\)]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    };

    const pattern = patterns[format];
    if (!pattern) {
      return {valid: true};
    }

    return {valid: pattern.test(value)};
  }

  /**
   * Validate cross-field constraints (before/after date)
   */
  async _validateCrossFieldConstraints(data, operation) {
    const errors = [];

    for (const fieldName in this.validationConfig) {
      const config = this.validationConfig[fieldName];
      const constraints = config.constraints || {};

      if (constraints.before) {
        const beforeField = constraints.before;
        if (data[fieldName] && data[beforeField]) {
          try {
            if (new Date(data[fieldName]) >= new Date(data[beforeField])) {
              const message = constraints.beforeMessage || `Field '${fieldName}' must be before '${beforeField}'`;
              errors.push(message);
            }
          } catch (e) {
            errors.push(`Invalid date format for field '${fieldName}': cannot compare dates`);
          }
        }
      }

      if (constraints.after) {
        const afterField = constraints.after;
        if (data[fieldName] && data[afterField]) {
          try {
            if (new Date(data[fieldName]) <= new Date(data[afterField])) {
              const message = constraints.afterMessage || `Field '${fieldName}' must be after '${afterField}'`;
              errors.push(message);
            }
          } catch (e) {
            errors.push(`Invalid date format for field '${fieldName}': cannot compare dates`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  
}

// Export singleton instance
module.exports = new ItemProductModel();
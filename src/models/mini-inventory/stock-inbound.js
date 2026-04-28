const BaseModel = require('restforgejs/src/models/base-model');
const db = require('restforgejs/src/utils/db');
const fs = require('fs');
const path = require('path');
// AdvancedFilterHelper dihapus — semua filtering ditangani oleh buildObjectFilterClause dan buildComplexWhereClause

/**
 * StockInbound Model - Auto-generated on 2026-04-15 00:36:58
 *
 * Model untuk stock-inbound yang mewarisi fungsi-fungsi dari BaseModel
 * Table: stock_inbound
 * Fields: 11 fields
 * Database: PostgreSQL
 */
class StockInboundModel extends BaseModel {
  /**
   * Constructor
   */
  constructor() {
    // Definisikan validFields - semua field yang valid untuk tabel stock-inbound
    const validFields = [
      'stock_inbound_id',
      'inbound_number',
      'inbound_date',
      'warehouse_id',
      'supplier_id',
      'reference_number',
      'notes',
      'total_items',
      'total_qty',
      'total_amount',
      'status'
    ];

    // Definisikan datatablesWhere sesuai payload
    const datatablesWhere = ["inbound_number","warehouse_code","warehouse_name","supplier_code","supplier_name","reference_number","status","all"];

    // Panggil constructor parent dengan nama tabel, validFields, dan datatablesWhere
    super('stock_inbound', validFields, datatablesWhere);

    // Setup primary key dari payload atau fallback ke fieldName pertama
    this.primaryKey = 'stock_inbound_id';

    // Setup viewName untuk operasi read jika berbeda dari tableName
    this.viewName = 'stock_inbound';
    this.readSource = 'stock_inbound'; // Source untuk operasi read (get, list, lookup, datatables)
    this.writeSource = 'stock_inbound'; // Source untuk operasi write (add, update, delete)

    // Flag untuk self-documenting API (endpoint /info)
    this.hasViewQuery = false;
    this.hasExportQuery = false;

    // Load advanced query templates
    this.advancedQueryTemplates = this.loadAdvancedQueryTemplates();
    
    this.validationConfig = {}; // No field validation config

    // Model metadata
    this.modelMetadata = {
      endpointName: 'stock-inbound',
      moduleName: 'mini-inventory',
      tableName: 'stock_inbound',
      viewName: 'stock_inbound',
      fieldCount: 11,
      databaseType: 'postgres',
      generated: '2026-04-15 00:36:58',
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
   * Override getListQuery untuk menyesuaikan dengan kebutuhan stock-inbound
   * @param {Object} options - Query options
   * @returns {string} SQL query dasar untuk stock-inbound
   */
  getListQuery(options = {}) {
    // Load query dasar dengan placeholder replacement
    
    // Load query dari file lokal
    let baseQuery;
    try {
      const queryFilePath = path.join(__dirname, 'query', 'stock-inbound-datatables.sql');
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
    // Fallback: gunakan readSource langsung (semua kolom tersedia)
    return 'SELECT * FROM ' + this.readSource;
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
   * Override getLookupData untuk menggunakan kolom 'stock_inbound_id' yang benar
   * @param {string} search - Kata kunci pencarian
   * @returns {Array} Array objek hasil lookup
   */
  async getLookupData(search) {
    try {
      const query = 'SELECT stock_inbound_id, stock_inbound_id FROM ' + this.getLookupSource() + ' WHERE upper(a.stock_inbound_id) LIKE upper($1) ORDER BY a.stock_inbound_id';

      const params = [`%${search || ''}%`];

      const data = await db.executeQuery(query, params);

      const result = data.map(item => ({
        id: item.stock_inbound_id,
        text: item.stock_inbound_id
      }));

      return result;
    } catch (error) {
      console.error('Error in getLookupData (StockInboundModel):', error);
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
      const lookupConfig = null;
      const textFields = lookupConfig && lookupConfig.searchFields.length > 0
        ? lookupConfig.searchFields
        : [];

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
        if (value && ["stock_inbound_id","inbound_number","inbound_date","warehouse_id","supplier_id","reference_number","notes","total_items","total_qty","total_amount","status"].includes(key)) {
          whereConditions.push(`a.${key} = $${paramIndex++}`);
          params.push(value);
        }
      }

      // Build final query - gunakan custom select jika ada
      const idField = lookupConfig ? lookupConfig.idField : 'stock_inbound_id';
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
        id: item[idField] || item.stock_inbound_id,
        text: item[lookupConfig && lookupConfig.hasCustomText ? 'display_text' : textFields[0]] || ''
      }));
    } catch (error) {
      console.error('Error in getLookupDataDynamic (StockInboundModel):', error);
      throw error;
    }
  }

  /**
   * Override getStaticLookupData untuk menggunakan kolom 'stock_inbound_id' yang benar
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

      const query = 'SELECT stock_inbound_id, stock_inbound_id FROM ' + this.getLookupSource() + ' ORDER BY a.stock_inbound_id';

      const data = await db.executeQuery(query);

      // Cache result tanpa selected flag
      const cacheData = data.map(item => ({
        id: item.stock_inbound_id,
        text: item.stock_inbound_id
      }));
      await this.setCachedLookup(cacheOptions, cacheData, 'static');

      // Return dengan selected flag
      return data.map(item => {
        const result = {
          id: item.stock_inbound_id,
          text: item.stock_inbound_id
        };

        if (item.stock_inbound_id === selectedTag) {
          result.selected = 'true';
        }

        return result;
      });
    } catch (error) {
      console.error('Error in getStaticLookupData (StockInboundModel):', error);
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

      const selectColumns = options.select || ['stock_inbound_id', 'stock_inbound_id'];
      let params = [];
      let paramIndex = 1;

      // Parse dan validasi select columns untuk support SQL expressions
      const validTextFields = [];
      let selectClause = 'stock_inbound_id';
      let textField = 'stock_inbound_id';
      let aliasField = null;

      // Proses setiap column dalam select
      for (const column of selectColumns) {
        if (column.toLowerCase() === 'stock_inbound_id'.toLowerCase()) {
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
        if (validTextFields.includes(column) || column === 'stock_inbound_id') {
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
          if (!this.validFields.includes(column) && column !== 'stock_inbound_id') return null;
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

      console.log('=== DEBUG STOCK-INBOUND LOOKUP WITH FILTER ===');
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
        id: item.stock_inbound_id,
        text: item[textFieldName] || item.stock_inbound_id || item.name || item.code || item.description || ''
      }));

      // Cache the result (if enabled)
      await this.setCachedLookup(cacheOptions, result, 'filter');

      return result;

    } catch (error) {
      console.error('Error in getLookupDataWithFilter (StockInboundModel):', error);
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
      textFields: [],
      dateFields: ["inbound_date"],
      requiredFields: [],
      primaryTextField: 'stock_inbound_id',
      searchableFields: this.getSearchableColumns ? this.getSearchableColumns().map(col => col.name) : []
    };
  }

  /**
   * Override formatResponseData untuk stock-inbound
   * @param {Object} data - Data dari database
   * @returns {Object} Data yang sudah diformat untuk response stock-inbound
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

  

  /**
   * Composite create - Create header with detail items in a single transaction
   * @param {Object} data - Data containing header and detail items array
   * @returns {Promise<Object>} Created record with items
   */
  async createComposite(data, eventContext = null) {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Extract header data (exclude detail items)
      const headerData = { ...data };
      const detailKey = 'stock_inbound_item';
      delete headerData[detailKey];

      // --- Hook: onBeforeCompositeInsert ---
      if (eventContext && eventContext.componentEngine) {
        const { componentEngine: ce, ContextBuilder: CB } = eventContext;
        const detailItems = data[detailKey] || [];
        const beforeCtx = CB.buildCompositeInsertBeforeContext(headerData, detailItems, {
          tableName: 'stock_inbound',
          detailTable: 'stock_inbound_item',
          foreignKey: 'stock_inbound_id',
          ...(eventContext.additionalContext || {})
        });
        const beforeResult = await ce.executeOnBeforeComposite('insert', beforeCtx);
        if (!beforeResult.success) {
          await client.query('ROLLBACK');
          throw new Error(`onBeforeCompositeInsert failed: ${beforeResult.error}`);
        }
      }

      // Build header INSERT query
      const headerFields = [];
      const headerValues = [];
      const headerPlaceholders = [];
      let placeholderIndex = 1;

      for (const [key, value] of Object.entries(headerData)) {
        if (value !== undefined && value !== null) {
          headerFields.push(key);
          headerValues.push(value);
          headerPlaceholders.push(`$${placeholderIndex++}`);
        }
      }

      const headerInsertQuery = `
        INSERT INTO ${this.writeSource} (${headerFields.join(', ')})
        VALUES (${headerPlaceholders.join(', ')})
        RETURNING *
      `;

      console.log('Executing header INSERT:', { query: headerInsertQuery, values: headerValues });
      const headerResult = await client.query(headerInsertQuery, headerValues);
      const insertedHeader = headerResult.rows[0];
      const masterPrimaryKeyValue = insertedHeader[this.primaryKey];

      console.log(`Header inserted successfully: ${this.primaryKey}=${masterPrimaryKeyValue}`);

      // Insert detail items
      const insertedItems = [];
      const detailTableName = 'stock_inbound_item';
      const foreignKey = 'stock_inbound_id';
      

      for (const item of data[detailKey] || []) {
        // Add foreign key to item
        item[foreignKey] = masterPrimaryKeyValue;

        // Auto-calculate total_amount = qty_received * unit_price
        item.total_amount = (Number(item.qty_received) || 0) * (Number(item.unit_price) || 0);

        // Build detail INSERT query
        const detailFields = [];
        const detailValues = [];
        const detailPlaceholders = [];
        let detailPlaceholderIndex = 1;

        for (const [key, value] of Object.entries(item)) {
          

          if (value !== undefined && value !== null) {
            detailFields.push(key);
            detailValues.push(value);
            detailPlaceholders.push(`$${detailPlaceholderIndex++}`);
          }
        }

        const detailInsertQuery = `
          INSERT INTO ${detailTableName} (${detailFields.join(', ')})
          VALUES (${detailPlaceholders.join(', ')})
          RETURNING *
        `;

        console.log('Executing detail INSERT:', { query: detailInsertQuery, values: detailValues });
        const detailResult = await client.query(detailInsertQuery, detailValues);
        insertedItems.push(detailResult.rows[0]);
      }

      console.log(`Inserted ${insertedItems.length} detail item(s)`);

      // --- Hook: onAfterCompositeInsert ---
      if (eventContext && eventContext.componentEngine) {
        const { componentEngine: ce, ContextBuilder: CB } = eventContext;
        const afterCtx = CB.buildCompositeInsertAfterContext(headerData, insertedHeader, insertedItems, {
          tableName: 'stock_inbound',
          detailTable: 'stock_inbound_item',
          foreignKey: 'stock_inbound_id',
          primaryKey: this.primaryKey,
          ...(eventContext.additionalContext || {})
        });
        const afterResult = await ce.executeOnAfterComposite('insert', afterCtx);
        if (!afterResult.success) {
          await client.query('ROLLBACK');
          throw new Error(`onAfterCompositeInsert failed: ${afterResult.error}`);
        }
      }

      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      // Invalidate cache setelah write operation berhasil
      await this.invalidateCache();

      return {
        ...insertedHeader,
        [detailKey]: insertedItems
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in createComposite:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Composite update - Update header with granular detail operations (insert/update/delete)
   * @param {Object} data - Data containing header and detail_lines with insert/update/delete arrays
   * @returns {Promise<Object>} Updated record with items
   */
  async updateComposite(data, eventContext = null) {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Extract primary key value
      const primaryKeyValue = data[this.primaryKey];
      if (!primaryKeyValue) {
        throw new Error(`Primary key ${this.primaryKey} is required for update`);
      }

      // Check if record exists (also serves as prefetch oldData for hooks)
      const checkQuery = `SELECT * FROM ${this.writeSource} WHERE ${this.primaryKey} = $1`;
      const checkResult = await client.query(checkQuery, [primaryKeyValue]);

      if (checkResult.rows.length === 0) {
        throw new Error('Record not found');
      }

      const oldData = checkResult.rows[0];

      // Extract header data (exclude detail items and primary key)
      const headerData = { ...data };
      const detailKey = 'stock_inbound_item';
      delete headerData[detailKey];
      delete headerData[this.primaryKey];

      // --- Hook: onBeforeCompositeUpdate ---
      if (eventContext && eventContext.componentEngine) {
        const { componentEngine: ce, ContextBuilder: CB } = eventContext;
        const detailOps = data[detailKey] || {};
        const beforeCtx = CB.buildCompositeUpdateBeforeContext(headerData, oldData, {
          insert: detailOps.insert || [],
          update: detailOps.update || [],
          delete: detailOps.delete || []
        }, {
          tableName: 'stock_inbound',
          detailTable: 'stock_inbound_item',
          foreignKey: 'stock_inbound_id',
          primaryKey: this.primaryKey,
          ...(eventContext.additionalContext || {})
        });
        const beforeResult = await ce.executeOnBeforeComposite('update', beforeCtx);
        if (!beforeResult.success) {
          await client.query('ROLLBACK');
          throw new Error(`onBeforeCompositeUpdate failed: ${beforeResult.error}`);
        }
      }

      // Build header UPDATE query
      const headerFields = [];
      const headerValues = [];
      let placeholderIndex = 1;

      for (const [key, value] of Object.entries(headerData)) {
        if (value !== undefined && value !== null) {
          headerFields.push(`${key} = $${placeholderIndex++}`);
          headerValues.push(value);
        }
      }

      headerValues.push(primaryKeyValue);
      const headerUpdateQuery = `
        UPDATE ${this.writeSource}
        SET ${headerFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE ${this.primaryKey} = $${placeholderIndex}
        RETURNING *
      `;

      console.log('Executing header UPDATE:', { query: headerUpdateQuery, values: headerValues });
      const headerResult = await client.query(headerUpdateQuery, headerValues);
      const updatedHeader = headerResult.rows[0];

      console.log(`Header updated successfully: ${this.primaryKey}=${primaryKeyValue}`);

      // Process detail items with insert/update/delete pattern
      const detailTableName = 'stock_inbound_item';
      const foreignKey = 'stock_inbound_id';
      const detailPrimaryKey = 'stock_inbound_item_id';
      

      const detailOperations = data[detailKey] || {};
      const { insert: insertItems = [], update: updateItems = [], delete: deleteItems = [] } = detailOperations;

      const deletedItems = [];
      const updatedItems = [];
      const insertedItems = [];

      // 1. Process DELETE operations first
      for (const item of deleteItems) {
        if (!item[detailPrimaryKey]) {
          throw new Error(`Missing ${detailPrimaryKey} in delete operation`);
        }

        const deleteQuery = `DELETE FROM ${detailTableName} WHERE ${detailPrimaryKey} = $1 RETURNING *`;
        const deleteResult = await client.query(deleteQuery, [item[detailPrimaryKey]]);

        if (deleteResult.rows.length > 0) {
          deletedItems.push(deleteResult.rows[0]);
        }
      }

      console.log(`Deleted ${deletedItems.length} detail item(s)`);

      // 2. Process UPDATE operations
      for (const item of updateItems) {
        if (!item[detailPrimaryKey]) {
          throw new Error(`Missing ${detailPrimaryKey} in update operation`);
        }

        // Auto-calculate total_amount = qty_received * unit_price
        item.total_amount = (Number(item.qty_received) || 0) * (Number(item.unit_price) || 0);

        // Build detail UPDATE query
        const detailFields = [];
        const detailValues = [];
        let detailPlaceholderIndex = 1;

        for (const [key, value] of Object.entries(item)) {
          if (key === detailPrimaryKey) continue;
          

          if (value !== undefined && value !== null) {
            detailFields.push(`${key} = $${detailPlaceholderIndex++}`);
            detailValues.push(value);
          }
        }

        detailValues.push(item[detailPrimaryKey]);
        const detailUpdateQuery = `
          UPDATE ${detailTableName}
          SET ${detailFields.join(', ')}
          WHERE ${detailPrimaryKey} = $${detailPlaceholderIndex}
          RETURNING *
        `;

        const detailResult = await client.query(detailUpdateQuery, detailValues);
        if (detailResult.rows.length > 0) {
          updatedItems.push(detailResult.rows[0]);
        }
      }

      console.log(`Updated ${updatedItems.length} detail item(s)`);

      // 3. Process INSERT operations
      for (const item of insertItems) {
        // Add foreign key to item
        item[foreignKey] = primaryKeyValue;

        // Auto-calculate total_amount = qty_received * unit_price
        item.total_amount = (Number(item.qty_received) || 0) * (Number(item.unit_price) || 0);

        // Build detail INSERT query
        const detailFields = [];
        const detailValues = [];
        const detailPlaceholders = [];
        let detailPlaceholderIndex = 1;

        for (const [key, value] of Object.entries(item)) {
          if (key === detailPrimaryKey && !value) continue;
          

          if (value !== undefined && value !== null) {
            detailFields.push(key);
            detailValues.push(value);
            detailPlaceholders.push(`$${detailPlaceholderIndex++}`);
          }
        }

        const detailInsertQuery = `
          INSERT INTO ${detailTableName} (${detailFields.join(', ')})
          VALUES (${detailPlaceholders.join(', ')})
          RETURNING *
        `;

        const detailResult = await client.query(detailInsertQuery, detailValues);
        insertedItems.push(detailResult.rows[0]);
      }

      console.log(`Inserted ${insertedItems.length} new detail item(s)`);

      // Get all current detail items
      const allItemsQuery = `SELECT * FROM ${detailTableName} WHERE ${foreignKey} = $1 ORDER BY line_number`;
      const allItemsResult = await client.query(allItemsQuery, [primaryKeyValue]);
      const allItems = allItemsResult.rows;

      // Recalculate header totals from final items
      
      const calculations = {"total_items":{"type":"count","source":"items.length","description":"Total number of distinct items"},"total_qty":{"type":"sum","source":"items.qty_received","description":"Sum of all qty_received from items"},"total_amount":{"type":"sum","source":"items.total_amount","description":"Sum of all total_amount from items"}};
      const recalculatedFields = [];
      const recalculatedValues = [];
      let recalcPlaceholder = 1;

      if (calculations.total_items) {
        recalculatedFields.push(`total_items = $${recalcPlaceholder++}`);
        recalculatedValues.push(allItems.length);
      }

      if (calculations.total_qty && calculations.total_qty.source) {
        const qtyField = calculations.total_qty.source.replace('items.', '');
        const totalQty = allItems.reduce((sum, item) => sum + (Number(item[qtyField]) || 0), 0);
        recalculatedFields.push(`total_qty = $${recalcPlaceholder++}`);
        recalculatedValues.push(totalQty);
      }

      if (calculations.total_amount) {
        const totalAmount = allItems.reduce((sum, item) => {
          const qty = Number(item.qty_received) || 0;
          const price = Number(item.unit_price) || 0;
          return sum + (qty * price);
        }, 0);
        recalculatedFields.push(`total_amount = $${recalcPlaceholder++}`);
        recalculatedValues.push(totalAmount);
      }

      if (recalculatedFields.length > 0) {
        recalculatedValues.push(primaryKeyValue);
        const recalcQuery = `
          UPDATE ${this.writeSource}
          SET ${recalculatedFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE ${this.primaryKey} = $${recalcPlaceholder}
          RETURNING *
        `;
        console.log('Recalculating header totals:', { query: recalcQuery, values: recalculatedValues });
        const recalcResult = await client.query(recalcQuery, recalculatedValues);
        Object.assign(updatedHeader, recalcResult.rows[0]);
      }
      

      // --- Hook: onAfterCompositeUpdate ---
      if (eventContext && eventContext.componentEngine) {
        const { componentEngine: ce, ContextBuilder: CB } = eventContext;
        const afterCtx = CB.buildCompositeUpdateAfterContext(headerData, oldData, updatedHeader, {
          inserted: insertedItems,
          updated: updatedItems,
          deleted: deletedItems
        }, {
          tableName: 'stock_inbound',
          detailTable: 'stock_inbound_item',
          foreignKey: 'stock_inbound_id',
          primaryKey: this.primaryKey,
          ...(eventContext.additionalContext || {})
        });
        const afterResult = await ce.executeOnAfterComposite('update', afterCtx);
        if (!afterResult.success) {
          await client.query('ROLLBACK');
          throw new Error(`onAfterCompositeUpdate failed: ${afterResult.error}`);
        }
      }

      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      // Invalidate cache setelah write operation berhasil
      await this.invalidateCache();

      return {
        ...updatedHeader,
        [detailKey]: allItems,
        _operations: {
          deleted: deletedItems.length,
          updated: updatedItems.length,
          inserted: insertedItems.length
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in updateComposite:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Composite read - Read header with detail items
   * @param {Object} options - Options with where clause (same format as getData)
   * @returns {Promise<Object>} Records with detail items
   */
  async readComposite(options) {
    try {
      // Build WHERE clause
      if (!options.where) {
        throw new Error('Invalid request format: where parameter is required');
      }

      let params = [];
      let paramIndex = 1;
      let whereClauseSql;
      try {
        whereClauseSql = this.buildComplexWhereClause(options.where, params, paramIndex);
      } catch (e) {
        const error = new Error('Invalid where conditions: ' + e.message);
        error.statusCode = 400;
        throw error;
      }

      // Query header records
      const headerQuery = 'SELECT * FROM ' + this.getTableSource('read') + ' WHERE ' + whereClauseSql.sql;
      params = whereClauseSql.params;

      const headerResults = await db.executeQuery(headerQuery, params);

      if (headerResults.length === 0) {
        return {
          success: true,
          count: 0,
          data: []
        };
      }

      // For each header, fetch detail items
      const compositeResults = [];
      const detailKey = 'stock_inbound_item';
      
      // Load detail query dari file lokal
      let detailQuery;
      try {
        const detailQueryFilePath = path.join(__dirname, 'query', 'stock-inbound-detailquery.sql');
        if (fs.existsSync(detailQueryFilePath)) {
          detailQuery = fs.readFileSync(detailQueryFilePath, 'utf8').trim();
        } else {
          throw new Error(`Detail query file not found: ${detailQueryFilePath}`);
        }
      } catch (error) {
        throw new Error('Failed to load detail query file: ' + error.message);
      }

      for (const header of headerResults) {
        const detailResults = await db.executeQuery(detailQuery, [header[this.primaryKey]]);

        compositeResults.push({
          ...header,
          [detailKey]: detailResults
        });
      }

      return {
        success: true,
        count: compositeResults.length,
        data: compositeResults
      };

    } catch (error) {
      console.error('Error in readComposite:', error);
      throw error;
    }
  }


  /**
   * Delete data with cascadeDelete support
   * @param {Object} options - Delete options with where clause
   * @param {Object} eventContext - Event lifecycle context (optional)
   * @returns {Promise<Object>} Delete result
   */
  async deleteData(options, eventContext = null) {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Extract where clause
      const where = options.where || [];
      if (!where || where.length === 0) {
        throw new Error('Where clause is required for delete operation');
      }

      // Build WHERE clause
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (Array.isArray(where)) {
        const conditions = where.map(condition => {
          params.push(condition.value);
          return `${condition.key} = $${paramIndex++}`;
        });
        whereClause = conditions.join(' AND ');
      } else if (where.conditions) {
        // Handle complex where format
        const conditions = where.conditions.map(condition => {
          params.push(condition.value);
          const operator = condition.operator || '=';
          return `${condition.key} ${operator} $${paramIndex++}`;
        });
        const logic = where.logic || 'AND';
        whereClause = conditions.join(` ${logic} `);
      }

      if (!whereClause) {
        throw new Error('Invalid where clause format');
      }

      
      // cascadeDelete = true: DELETE child records first, then header
      console.log('Deleting child records from stock_inbound_item...');

      // Get primary key value untuk delete child records
      const headerQuery = `SELECT stock_inbound_id FROM ${this.writeSource} WHERE ${whereClause}`;
      const headerResult = await client.query(headerQuery, params);

      if (headerResult.rows.length === 0) {
        throw new Error('Record not found');
      }

      const headerPrimaryKeyValue = headerResult.rows[0]['stock_inbound_id'];

      // DELETE child records menggunakan foreignKey
      const deleteChildQuery = `DELETE FROM stock_inbound_item WHERE stock_inbound_id = $1`;
      const deleteChildResult = await client.query(deleteChildQuery, [headerPrimaryKeyValue]);

      console.log(`Deleted ${deleteChildResult.rowCount} child record(s) from stock_inbound_item`);

      // DELETE header record
      const deleteHeaderQuery = `DELETE FROM ${this.writeSource} WHERE ${whereClause} RETURNING *`;
      const deleteHeaderResult = await client.query(deleteHeaderQuery, params);

      if (deleteHeaderResult.rows.length === 0) {
        throw new Error('Record not found');
      }

      const deletedData = deleteHeaderResult.rows[0];
      console.log('Header record deleted successfully');
      

      await client.query('COMMIT');

      // Invalidate cache setelah write operation berhasil
      await this.invalidateCache();

      return {
        success: true,
        message: 'Data successfully deleted',
        data: deletedData,
        deletedChildRecords: deleteChildResult.rowCount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in deleteData:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

// Export singleton instance
module.exports = new StockInboundModel();
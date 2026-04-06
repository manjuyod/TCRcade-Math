import sql from 'mssql';

// CRM Database connection configuration
const crmConfig: sql.config = {
  server: process.env.CRMSrvAddress!,
  database: process.env.CRMSrvDb!,
  user: process.env.CRMSrvUs!,
  password: process.env.CRMSrvPs!,
  options: {
    encrypt: true, // Use encryption for security
    trustServerCertificate: true, // Trust the server certificate
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Connection pool for CRM database
let crmPool: sql.ConnectionPool | null = null;

export async function getCrmConnection(): Promise<sql.ConnectionPool> {
  if (!crmPool) {
    console.log('Creating new CRM database connection pool...');
    crmPool = new sql.ConnectionPool(crmConfig);
    
    try {
      await crmPool.connect();
      console.log('✓ CRM database connection established successfully');
    } catch (error) {
      console.error('✗ Failed to connect to CRM database:', error);
      crmPool = null;
      throw error;
    }
  }
  
  return crmPool;
}

export async function testCrmConnection(): Promise<boolean> {
  try {
    const pool = await getCrmConnection();
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✓ CRM database test query successful:', result.recordset);
    return true;
  } catch (error) {
    console.error('✗ CRM database test failed:', error);
    return false;
  }
}

export async function getFranchises(): Promise<{ franchiseID: number; franchiseName: string }[]> {
  try {
    const pool = await getCrmConnection();
    const result = await pool.request().query(`
      SELECT ID AS franchiseID, FranchiesName 
      FROM tblFranchies
    `);
    
    console.log(`✓ Retrieved ${result.recordset.length} franchises from CRM`);
    return result.recordset.map((row: any) => ({
      franchiseID: row.franchiseID,
      franchiseName: row.FranchiesName
    }));
  } catch (error) {
    console.error('✗ Error fetching franchises:', error);
    return [];
  }
}

export async function getStudentsByFranchise(franchiseID: number): Promise<{ studentID: number; studentName: string }[]> {
  try {
    const pool = await getCrmConnection();
    const result = await pool.request()
      .input('franchiseID', sql.Int, franchiseID)
      .query(`
        SELECT ID AS studentID, CONCAT(Firstname, ' ', LastName) AS studentName
        FROM tblstudents 
        WHERE FranchiseID = @franchiseID
        AND IsDeleted = 0
        AND IsTrail != 'Inactive'
        Order BY Firstname, LastName
      `);
    
    console.log(`✓ Retrieved ${result.recordset.length} students for franchise ${franchiseID}`);
    return result.recordset.map((row: any) => ({
      studentID: row.studentID,
      studentName: row.studentName
    }));
  } catch (error) {
    console.error('✗ Error fetching students:', error);
    return [];
  }
}

export async function getStudentInfo(studentID: number): Promise<{ isValid: boolean; studentInfo?: any }> {
  try {
    const pool = await getCrmConnection();
    const result = await pool.request()
      .input('studentID', sql.Int, studentID)
      .query(`
        SELECT TOP 1 
          s.ID as studentID,
          s.Firstname,
          s.LastName,
          i.Email,
          s.Grade,
          s.FranchiseID,
          f.FranchiesName
        FROM tblstudents s
        LEFT JOIN tblFranchies f ON s.FranchiseID = f.ID
        LEFT JOIN tblInquiry i ON s.InquiryID = i.ID
        WHERE s.ID = @studentID
      `);
    
    if (result.recordset.length > 0) {
      const student = result.recordset[0];
      console.log(`✓ Student found: ${student.Firstname} ${student.LastName} from ${student.FranchiesName}`);
      
      return {
        isValid: true,
        studentInfo: {
          studentID: student.studentID,
          firstName: student.Firstname,
          lastName: student.LastName,
          email: student.Email,
          grade: student.Grade,
          franchiseID: student.FranchiseID,
          franchiseName: student.FranchiesName
        }
      };
    } else {
      console.log(`✗ Student ID ${studentID} not found in CRM`);
      return { isValid: false };
    }
  } catch (error) {
    console.error('✗ Error fetching student info:', error);
    return { isValid: false };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (crmPool) {
    console.log('Closing CRM database connection...');
    await crmPool.close();
  }
});

process.on('SIGTERM', async () => {
  if (crmPool) {
    console.log('Closing CRM database connection...');
    await crmPool.close();
  }
});
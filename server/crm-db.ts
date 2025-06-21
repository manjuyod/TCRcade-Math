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

export async function validateStudentNumber(studentNumber: string): Promise<{ isValid: boolean; studentInfo?: any }> {
  try {
    const pool = await getCrmConnection();
    
    // Query to check if student number exists in CRM
    // Adjust the table name and column names based on your CRM schema
    const result = await pool.request()
      .input('studentNumber', sql.VarChar, studentNumber)
      .query(`
        SELECT TOP 1 
          StudentID,
          FirstName, 
          LastName,
          Email,
          Grade,
          Status
        FROM Students 
        WHERE StudentID = @studentNumber 
        AND Status = 'Active'
      `);
    
    if (result.recordset.length > 0) {
      const student = result.recordset[0];
      console.log(`✓ Student found in CRM: ${student.FirstName} ${student.LastName} (Grade ${student.Grade})`);
      
      return {
        isValid: true,
        studentInfo: {
          studentId: student.StudentID,
          firstName: student.FirstName,
          lastName: student.LastName,
          email: student.Email,
          grade: student.Grade,
          status: student.Status
        }
      };
    } else {
      console.log(`✗ Student number ${studentNumber} not found in CRM or inactive`);
      return { isValid: false };
    }
  } catch (error) {
    console.error('✗ Error validating student number:', error);
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
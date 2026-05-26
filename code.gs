const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
const SHEET_NAME = 'usuarios';
const SHEET_VENTAS = 'ventas';
const SHEET_PAGOS = 'pagos';

function doGet(){
  var html = HtmlService.createTemplateFromFile("Index");
  return html.evaluate()
    .setTitle("S-M-System") // Browser tab title
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function incluirArchivo(pagina){
  return HtmlService.createTemplateFromFile(pagina).evaluate().getContent();
}


/* =======================================================
       ============ Users Section ==================
==========================================================*/

// Generates the next sequential user ID.
function obtenerSiguienteId() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  // Start at 1 when the sheet only contains headers.
  if (lastRow < 2) return 1; 
  
  // Read existing user IDs from column A.
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  // Identify the highest current ID.
  const maxId = Math.max(...ids.map(fila => Number(fila[0]) || 0));
  
  return maxId + 1;
}

// Retrieves active users and calculates their current balance.
function obtenerUsuarios() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaUsuarios = ss.getSheetByName(SHEET_NAME);
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS);
  const hojaPagos = ss.getSheetByName(SHEET_PAGOS);
  
  const datosUsuarios = hojaUsuarios.getDataRange().getValues();
  const datosVentas = hojaVentas.getLastRow() > 1 ? hojaVentas.getDataRange().getValues() : [];
  const datosPagos = hojaPagos.getLastRow() > 1 ? hojaPagos.getDataRange().getValues() : [];
  
  datosUsuarios.shift(); // Remove user headers.
  if (datosVentas.length > 0) datosVentas.shift(); // Remove sales headers.
  if (datosPagos.length > 0) datosPagos.shift();   // Remove payment headers.

  const mapaSaldos = {};

  // Add active and paid sales to each user's balance history.
  datosVentas.forEach(f => {
    const idU = String(f[0]); // Normalize ID format for comparison.
    const monto = parseFloat(f[3]) || 0;
    const estado = f[4] || 'ACTIVO';
    const idVenta = String(f[1] || "");
    const esSaldo = idVenta.startsWith("SALDO-");

    if (!esSaldo && (estado === 'ACTIVO' || estado === 'PAGADO')) {
      mapaSaldos[idU] = (mapaSaldos[idU] || 0) + monto;
    }
  });

  // Subtract active payments from each user's balance.
  datosPagos.forEach(f => {
    const idU = String(f[0]); 
    const monto = parseFloat(f[3]) || 0;
    const estado = f[4] || 'ACTIVO';
    if (estado === 'ACTIVO' ) {
      mapaSaldos[idU] = (mapaSaldos[idU] || 0) - monto;
    }
  });

  // Build the response object for the frontend.
  return datosUsuarios.map((fila, index) => {
    const idActual = String(fila[0]);
    return {
      row: index + 2,
      id: fila[0],
      nombre: fila[1],
      apellido: fila[2],
      celular: fila[3],
      estado: fila[4] || 'ACTIVO',
      totalDeuda: mapaSaldos[idActual] || 0
    };
  }).filter(u => u.estado === 'ACTIVO');
}

// Creates a new user or updates an existing user record.
function guardarUsuario(datos) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    if (datos.row) {
      // Update the existing row while keeping the user active.
      sheet.getRange(parseInt(datos.row), 1, 1, 5).setValues([[
        datos.id, 
        datos.nombre, 
        datos.apellido, 
        datos.celular, 
        'ACTIVO'
      ]]);
    } else {
      // Create a new active user with the next available ID.
      const nuevoId = obtenerSiguienteId();
      sheet.appendRow([nuevoId, datos.nombre, datos.apellido, datos.celular, 'ACTIVO']);
    }
    return true;
  } catch (e) {
    // Return the server error message to the frontend.
    throw new Error("Error en servidor: " + e.message);
  }
}

// Marks a user as inactive without deleting the row.
function desactivarUsuario(row) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  // Column E stores the user status.
  sheet.getRange(row, 5).setValue('INACTIVO');
  return true;
}



/* =======================================================
       ============ Sales Section ==================
==========================================================*/



// Generates the next sequential sale ID using the V- format.
function obtenerSiguienteIdVenta() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_VENTAS);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return "V-1";
  
  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Column B contains sale IDs.
  const numeros = ids.map(fila => {
    const parts = fila[0].toString().split('-');
    return parts.length > 1 ? parseInt(parts[1]) : 0;
  });
  
  const maxId = Math.max(...numeros);
  return "V-" + (maxId + 1);
}

// Retrieves active sales with the related user name.
function obtenerVentas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaUsuarios = ss.getSheetByName(SHEET_NAME).getDataRange().getValues();
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS).getDataRange().getValues();
  
  hojaVentas.shift(); // Remove headers.
  
  const mapaUsuarios = {};
  hojaUsuarios.forEach(fila => {
    mapaUsuarios[fila[0]] = fila[1] + " " + fila[2];
  });

  // Return only rows marked as active in column E.
  return hojaVentas.map((fila, index) => ({
    row: index + 2,
    idUsuario: fila[0],
    idVenta: fila[1],
    fecha: Utilities.formatDate(new Date(fila[2]), "GMT", "yyyy-MM-dd"),
    total: fila[3],
    estado: fila[4] || 'ACTIVO', // Column E stores the sale status.
    nombreU: mapaUsuarios[fila[0]] || "Usuario no encontrado"
  })).filter(v => v.estado === 'ACTIVO');
}

// Creates a new sale or updates an existing sale record.
function guardarVenta(datos) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_VENTAS);
  // Normalize the currency value before saving.
  const totalLimpio = datos.total.toString().replace(/[$.]/g, '').trim();

  if (datos.row) {
    // Keep the existing sale ID when updating the row.
    sheet.getRange(datos.row, 1, 1, 5).setValues([[
      datos.idUsuario, 
      datos.idVenta,
      datos.fecha, 
      totalLimpio, 
      'ACTIVO'
    ]]);
  } else {
    // Assign a new sale ID for new records.
    const nuevoIdVenta = obtenerSiguienteIdVenta();
    sheet.appendRow([datos.idUsuario, nuevoIdVenta, datos.fecha, totalLimpio, 'ACTIVO']);
  }
  return true;
}

// Marks a sale as inactive without deleting the row.
function desactivarVenta(row) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_VENTAS);
  // Column E stores the sale status.
  sheet.getRange(row, 5).setValue('INACTIVO');
  return true;
}



/* =======================================================
       ============ Payments Section ==================
==========================================================*/

// Retrieves active payments with the related user name.
function obtenerPagos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaUsuarios = ss.getSheetByName(SHEET_NAME).getDataRange().getValues();
  const hojaPagos = ss.getSheetByName(SHEET_PAGOS).getDataRange().getValues();
  
  hojaPagos.shift();
  const mapaU = {};
  hojaUsuarios.forEach(f => mapaU[f[0]] = f[1] + " " + f[2]);

  return hojaPagos.map((f, i) => ({
    row: i + 2,
    idUsuario: f[0],
    idPago: f[1],
    fecha: Utilities.formatDate(new Date(f[2]), "GMT", "yyyy-MM-dd"),
    total: f[3],
    estado: f[4] || 'ACTIVO',
    nombreU: mapaU[f[0]] || "Usuario no encontrado"
  })).filter(p => p.estado === 'ACTIVO');
}

function guardarPago(datos) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PAGOS);
  const totalLimpio = datos.total.toString().replace(/[$.]/g, '').trim();

  if (datos.row) {
    sheet.getRange(datos.row, 1, 1, 5).setValues([[datos.idUsuario, datos.idPago, datos.fecha, totalLimpio, 'ACTIVO']]);
  } else {
    const idPago = "P-" + (sheet.getLastRow()); // Basic sequential payment ID.
    sheet.appendRow([datos.idUsuario, idPago, datos.fecha, totalLimpio, 'ACTIVO']);
  }
  return true;
}

function desactivarPago(row) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaPagos = ss.getSheetByName(SHEET_PAGOS);

  const idPago = hojaPagos.getRange(row, 2).getValue();

  // Reverse the sales changes linked to this payment.
  revertirPagoConciliado(idPago);

  // Mark the payment as inactive.
  hojaPagos.getRange(row, 5).setValue("INACTIVO");

  SpreadsheetApp.flush();
  return true;
}




/**
 * Retrieves active sales for the selected user.
 * Used to populate the outstanding debt list in the payment modal.
 */
function obtenerVentasPorUsuario(idUsuario) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS);
  const datos = hojaVentas.getDataRange().getValues();
  datos.shift(); // Remove headers.

  // Return only active sales assigned to the selected user.
  return datos
    .map((f, index) => ({
      row: index + 2,
      idUsuario: f[0],
      idVenta: f[1],
      fecha: Utilities.formatDate(new Date(f[2]), "GMT-5", "dd/MM/yyyy"),
      total: parseFloat(f[3]) || 0,
      estado: f[4]
    }))
    .filter(v => v.idUsuario == idUsuario && v.estado === 'ACTIVO');
}

/**
 * Processes a payment and updates the related sales records.
 */

function procesarPagoConciliado(datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS);
  const hojaPagos = ss.getSheetByName(SHEET_PAGOS);

  let dineroDisponible = Number(datos.total) || 0;

  if (!datos.idUsuario || dineroDisponible <= 0) {
    return false;
  }

  let idPago = datos.idPago;

  // Editing an existing payment requires reversing its previous impact first.
  if (datos.row) {
    idPago = datos.idPago;

    // Restore the sales affected by the previous version of this payment.
    revertirPagoConciliado(idPago);

    // Update the existing payment row.
    hojaPagos.getRange(Number(datos.row), 1, 1, 5).setValues([[
      datos.idUsuario,
      idPago,
      datos.fecha,
      dineroDisponible,
      "ACTIVO"
    ]]);
  } else {
    // Create a new payment record.
    idPago = "P-" + (hojaPagos.getLastRow() + 1);

    hojaPagos.appendRow([
      datos.idUsuario,
      idPago,
      datos.fecha,
      dineroDisponible,
      "ACTIVO"
    ]);
  }

  aplicarPagoAVentas(datos.idUsuario, datos.fecha, dineroDisponible, idPago);

  SpreadsheetApp.flush();
  return true;
}



function revertirPagoConciliado(idPago) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS);
  const datos = hojaVentas.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    const idVenta = String(datos[i][1]);
    const nota = String(datos[i][5] || "");

    if (nota.includes(idPago)) {
      // Inactivate balance rows created by this payment.
      if (idVenta.startsWith("SALDO-")) {
        hojaVentas.getRange(i + 1, 5).setValue("INACTIVO");
        hojaVentas.getRange(i + 1, 6).setValue(nota + " | Anulado por edición de " + idPago);
      } 
      // Restore original sales previously paid by this payment.
      else {
        hojaVentas.getRange(i + 1, 5).setValue("ACTIVO");
        hojaVentas.getRange(i + 1, 6).setValue("");
      }
    }
  }
}

function aplicarPagoAVentas(idUsuario, fechaPago, dineroDisponible, idPago) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaVentas = ss.getSheetByName(SHEET_VENTAS);
  const valoresVentas = hojaVentas.getDataRange().getValues();

  for (let i = 1; i < valoresVentas.length; i++) {
    if (dineroDisponible <= 0) break;

    const idUsuarioVenta = valoresVentas[i][0];
    const idVenta = valoresVentas[i][1];
    const valorVenta = Number(valoresVentas[i][3]) || 0;
    const estado = String(valoresVentas[i][4]).trim().toUpperCase();

    if (
      String(idUsuarioVenta) === String(idUsuario) &&
      estado === "ACTIVO"
    ) {
      if (dineroDisponible >= valorVenta) {
        hojaVentas.getRange(i + 1, 5).setValue("PAGADO");
        hojaVentas.getRange(i + 1, 6).setValue("Pagado por " + idPago);
        dineroDisponible -= valorVenta;
      } else {
        hojaVentas.getRange(i + 1, 5).setValue("PAGADO");
        hojaVentas.getRange(i + 1, 6).setValue("Abono parcial por " + idPago);

        const saldoRestante = valorVenta - dineroDisponible;
        const nuevoId = "SALDO-" + idVenta;

        hojaVentas.appendRow([
          idUsuario,
          nuevoId,
          fechaPago,
          saldoRestante,
          "ACTIVO",
          "Saldo de " + idVenta + " generado por " + idPago + ". Abonó $" + dineroDisponible
        ]);

        dineroDisponible = 0;
      }
    }
  }
}









/* =======================================================
       ============ Metrics Section ==================
==========================================================*/

function obtenerMetricas(inicio, fin) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const vData = ss.getSheetByName(SHEET_VENTAS).getDataRange().getValues();
  const pData = ss.getSheetByName(SHEET_PAGOS).getDataRange().getValues();
  
  vData.shift();
  pData.shift();

  let totalVentas = 0;
  let totalPagos = 0;

  // Determine whether a date range filter is being applied.
  const filtrando = (inicio && fin);
  let fInicio = filtrando ? new Date(inicio + "T00:00:00") : null;
  let fFin = filtrando ? new Date(fin + "T23:59:59") : null;

  // Calculate active sales within the selected date range.
  vData.forEach(f => {
    if (f[4] === 'ACTIVO') {
      const fechaVenta = new Date(f[2]);
      // Include all records when no date filter is selected.
      if (!filtrando || (fechaVenta >= fInicio && fechaVenta <= fFin)) {
        totalVentas += parseFloat(f[3]) || 0;
      }
    }
  });

  // Calculate active payments within the selected date range.
  pData.forEach(f => {
    if (f[4] === 'ACTIVO') {
      const fechaPago = new Date(f[2]);
      if (!filtrando || (fechaPago >= fInicio && fechaPago <= fFin)) {
        totalPagos += parseFloat(f[3]) || 0;
      }
    }
  });

  const todosLosUsuarios = obtenerUsuarios();
  const topDeudores = todosLosUsuarios
    .filter(u => u.totalDeuda > 0)
    .sort((a, b) => b.totalDeuda - a.totalDeuda)
    .slice(0, 5);

  return {
    totalVentas,
    totalPagos,
    saldoPendiente: totalVentas - totalPagos,
    topDeudores,
    fechaInicio: inicio || "", // Keep empty when no filter is selected.
    fechaFin: fin || "",
    tituloGrafica: filtrando ? "Balance del Periodo" : "Balance Total Histórico"
  };
}

/* =======================================================
       ============ WhatsApp Section ==================
==========================================================*/


function obtenerHistorialMensaje(idUsuario) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ventas = ss.getSheetByName(SHEET_VENTAS).getDataRange().getValues();
  const pagos = ss.getSheetByName(SHEET_PAGOS).getDataRange().getValues();
  const usuario = obtenerUsuarios().find(u => String(u.id) === String(idUsuario));

  ventas.shift();
  pagos.shift();

  let textoVentas = "";
  ventas.forEach(f => {
    if (String(f[0]) === String(idUsuario) && f[4] === 'ACTIVO') {
      const fecha = Utilities.formatDate(new Date(f[2]), "GMT-5", "dd/MM/yyyy");
      const monto = new Intl.NumberFormat('de-DE').format(f[3]);
      textoVentas += `Dia ${fecha}: $${monto}\n`;
    }
  });

  return {
    nombre: usuario.nombre,
    celular: usuario.celular.replace(/-/g, ""), // Remove separators from the phone number.
    detalle: textoVentas,
    deudaTotal: new Intl.NumberFormat('de-DE').format(usuario.totalDeuda)
  };
}

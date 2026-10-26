const xmlEscape = (value) =>
  Array.from(String(value))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const safeFileName = (value) =>
  String(value || "report")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "report";

const getColumnName = (columnNumber) => {
  let name = "";
  let number = columnNumber;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
};

const toExcelDate = (date) => {
  return (
    (Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      0,
    ) -
      Date.UTC(1899, 11, 30)) /
    86400000
  );
};

const makeCell = (reference, value, style) => {
  const styleAttribute = style !== undefined ? ` s="${style}"` : "";
  if (value === null || value === undefined || value === "") {
    return `<c r="${reference}"${styleAttribute}/>`;
  }

  let dateObj = null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    dateObj = value;
  } else if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)
  ) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) dateObj = d;
  }

  if (dateObj) {
    return `<c r="${reference}"${styleAttribute}><v>${toExcelDate(dateObj)}</v></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${reference}"${styleAttribute} t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
};

const getStyles = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="6">
    <numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="dd.mm.yyyy"/>
    <numFmt numFmtId="167" formatCode="dd.mm.yyyy hh:mm"/>
    <numFmt numFmtId="168" formatCode="&quot;$&quot;#,##0.00;[Red]-&quot;$&quot;#,##0.00"/>
    <numFmt numFmtId="169" formatCode="#,##0.##"/>
  </numFmts>
  <fonts count="4">
    <!-- 0: Regular -->
    <font><sz val="10"/><name val="Aptos"/><color rgb="FF1F2937"/></font>
    <!-- 1: Header white bold -->
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
    <!-- 2: Title Banner large bold white -->
    <font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
    <!-- 3: Label semi-bold dark -->
    <font><b/><sz val="10"/><color rgb="FF344054"/><name val="Aptos"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Dark Forest Green Header -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E4620"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 3: Soft subtle green/gray zebra row -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F3"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: Light gray cell border -->
    <border>
      <left style="thin"><color rgb="FFD0D5DD"/></left>
      <right style="thin"><color rgb="FFD0D5DD"/></right>
      <top style="thin"><color rgb="FFD0D5DD"/></top>
      <bottom style="thin"><color rgb="FFD0D5DD"/></bottom>
      <diagonal/>
    </border>
    <!-- 2: Header border -->
    <border>
      <left style="thin"><color rgb="FF2D5F34"/></left>
      <right style="thin"><color rgb="FF2D5F34"/></right>
      <top style="thin"><color rgb="FF2D5F34"/></top>
      <bottom style="medium"><color rgb="FF163618"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="32">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1" applyProtection="1"><alignment vertical="center" horizontal="left"/><protection locked="0"/></xf>
    <!-- 1: Table Header (Dark Green, White Bold, Centered) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="center" wrapText="1"/><protection locked="0"/></xf>
    <!-- 2: Title Banner (A1:B1 merged, dark green, large white text) -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1" applyFill="1" applyProtection="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    
    <!-- Summary Row Styles: Even (White fill 0) and Odd (Zebra fill 3) -->
    <!-- 3: Summary Label Even (Bold dark text, white fill, left aligned) -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="left"/><protection locked="0"/></xf>
    <!-- 4: Summary Label Odd (Bold dark text, tint fill, left aligned) -->
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="left"/><protection locked="0"/></xf>
    
    <!-- 5: Summary Value Date Even (dd.mm.yyyy hh:mm, right aligned) -->
    <xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 6: Summary Value Date Odd (dd.mm.yyyy hh:mm, right aligned) -->
    <xf numFmtId="167" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    
    <!-- 7: Summary Value Integer Even (#,##0, right aligned) -->
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 8: Summary Value Integer Odd (#,##0, right aligned) -->
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    
    <!-- 9: Summary Value Sum Even (#,##0.00, right aligned) -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 10: Summary Value Sum Odd (#,##0.00, right aligned) -->
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    
    <!-- 11: Summary Value Dollar Even ($#,##0.00, right aligned) -->
    <xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 12: Summary Value Dollar Odd ($#,##0.00, right aligned) -->
    <xf numFmtId="168" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    
    <!-- 13: Summary Value Text Even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 14: Summary Value Text Odd -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>

    <!-- Table Data Rows: Even (White fill 0) -->
    <!-- 15: Date Centered Even -->
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 16: Rate/Integer Centered Even -->
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 17: Quantity Centered Even -->
    <xf numFmtId="169" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 18: Sum Currency Right Even -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 19: Dollar Currency Right Even -->
    <xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 20: Text Centered Even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 21: Text Left Even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="left"/><protection locked="0"/></xf>
    <!-- 22: Text Right Even -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>

    <!-- Table Data Rows: Odd (Tint fill 3 - Zebra) -->
    <!-- 23: Date Centered Odd -->
    <xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 24: Rate/Integer Centered Odd -->
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 25: Quantity Centered Odd -->
    <xf numFmtId="169" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 26: Sum Currency Right Odd -->
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 27: Dollar Currency Right Odd -->
    <xf numFmtId="168" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    <!-- 28: Text Centered Odd -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
    <!-- 29: Text Left Odd -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyFill="1" applyBorder="1"><alignment vertical="center" horizontal="left"/><protection locked="0"/></xf>
    <!-- 30: Text Right Odd -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="center" horizontal="right"/><protection locked="0"/></xf>
    
    <!-- 31: Title banner empty continuation cell -->
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1" applyFill="1" applyProtection="1"><alignment vertical="center" horizontal="center"/><protection locked="0"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const getTableDataStyle = (heading, value, isZebra) => {
  const headingText = String(heading || "").toLowerCase().trim();
  const isDate = value instanceof Date || /date|sana|дата/i.test(headingText);
  if (isDate) return isZebra ? 23 : 15;

  if (headingText === "$" || /^(kurs|rate)$/i.test(headingText)) {
    return isZebra ? 24 : 16;
  }

  if (/\$|dollar|usd/i.test(headingText) && headingText !== "$") {
    if (typeof value === "number") return isZebra ? 27 : 19;
    return isZebra ? 30 : 22;
  }

  if (/^(№|no\.?|soni|miqdori?|quantity|count)$/i.test(headingText)) {
    if (typeof value === "number") return isZebra ? 25 : 17;
    return isZebra ? 28 : 20;
  }

  if (/narxi?|so'?m|sum|amount|summa|olingan|qoldiq|tolangan|to'langan|jami|umumiy/i.test(headingText)) {
    if (typeof value === "number") return isZebra ? 26 : 18;
    return isZebra ? 30 : 22;
  }

  if (/bajarilish|foiz|percent|progress/i.test(headingText) || (typeof value === "string" && value.endsWith("%"))) {
    return isZebra ? 28 : 20;
  }

  if (/^(turi|type|o'?lcham|o'?lchov|birligi?|unit|guruhi?|group|holati?|status)$/i.test(headingText)) {
    return isZebra ? 28 : 20;
  }

  if (typeof value === "number") {
    return isZebra ? 26 : 18;
  }

  return isZebra ? 29 : 21;
};

const getSummaryValueStyle = (label, value, isZebra) => {
  const labelText = String(label || "").toLowerCase();
  if (value instanceof Date || /sana|date|дата/i.test(labelText)) {
    return isZebra ? 6 : 5;
  }
  if (/soni|count|son|количество/i.test(labelText)) {
    return isZebra ? 8 : 7;
  }
  if (/\$|dollar|usd/i.test(labelText)) {
    return isZebra ? 12 : 11;
  }
  if (/so'?m|sum|summa|narx|to'langan|tolangan|olingan|jami/i.test(labelText)) {
    if (typeof value === "number") return isZebra ? 10 : 9;
  }
  if (typeof value === "number") {
    return isZebra ? 10 : 9;
  }
  return isZebra ? 14 : 13;
};

export const downloadReportExcel = async ({
  fileName,
  title,
  summary,
  columns,
  rows,
  sections,
  separateWithHeaders = true,
}) => {
  const worksheetRows = [];
  let colsXml = "";
  let autoFilterXml = "";
  const mergeCellsList = [];
  let paneXml = "";
  let lastColumnName = "B";
  let lastRow = 1;

  if (Array.isArray(sections) && sections.length > 0) {
    // MULTIPLE SECTIONS (Export All)
    // Determine if sections are summary-type or table-type
    const isSummaryType = sections.some((s) => Array.isArray(s.summary) && s.summary.length > 0);

    if (isSummaryType) {
      // Calculate max label length across all sections
      let maxLabelLen = 25;
      sections.forEach((sec) => {
        (sec.summary || []).forEach(([lbl]) => {
          if (String(lbl || "").length > maxLabelLen) {
            maxLabelLen = String(lbl).length;
          }
        });
      });

      const colAWidth = Math.min(Math.max(maxLabelLen + 6, 38), 52);
      const colBWidth = 28;
      colsXml = `<col min="1" max="1" width="${colAWidth}" customWidth="1"/><col min="2" max="2" width="${colBWidth}" customWidth="1"/>`;
      lastColumnName = "B";

      let currentRow = 1;

      sections.forEach((sec, sIdx) => {
        if (separateWithHeaders) {
          // Banner row
          worksheetRows.push(
            `<row r="${currentRow}" ht="36" customHeight="1">${makeCell(`A${currentRow}`, sec.title || "Hisobot", 2)}${makeCell(`B${currentRow}`, "", 31)}</row>`,
          );
          mergeCellsList.push(`A${currentRow}:B${currentRow}`);
          currentRow += 1;
        }

        // Summary items for this section
        (sec.summary || []).forEach(([label, value], iIdx) => {
          const isZebra = iIdx % 2 === 1;
          const labelStyle = isZebra ? 4 : 3;
          const valueStyle = getSummaryValueStyle(label, value, isZebra);

          worksheetRows.push(
            `<row r="${currentRow}" ht="24" customHeight="1">${makeCell(`A${currentRow}`, label, labelStyle)}${makeCell(`B${currentRow}`, value, valueStyle)}</row>`,
          );
          currentRow += 1;
        });

        // Add an empty spacer row between sections
        if (sIdx < sections.length - 1) {
          worksheetRows.push(`<row r="${currentRow}" ht="18" customHeight="1"/>`);
          currentRow += 1;
        }
      });

      lastRow = currentRow - 1;
    } else {
      // Multiple table sections
      let currentRow = 1;
      const allCols = sections[0]?.columns || [];
      const lastColIdx = Math.max(allCols.length, 1);
      lastColumnName = getColumnName(lastColIdx);

      const widths = allCols.map((heading, cIdx) => {
        let maxLen = String(heading || "").length;
        sections.forEach((sec) => {
          (sec.rows || []).forEach((row) => {
            const val = row[cIdx];
            if (val instanceof Date) maxLen = Math.max(maxLen, 12);
            else if (typeof val === "number") maxLen = Math.max(maxLen, val.toLocaleString().length + 4);
            else maxLen = Math.max(maxLen, String(val ?? "").length);
          });
        });
        const headingStr = String(heading || "");
        let minW = 10;
        if (headingStr === "$") minW = 8;
        else if (/sana|date/i.test(headingStr)) minW = 13;
        else if (/narxi|umumiy|so'?m/i.test(headingStr)) minW = 18;
        else if (/nomi|name/i.test(headingStr)) minW = 32;
        return Math.min(Math.max(maxLen + 3, minW), 45);
      });

      colsXml = widths
        .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
        .join("");

      sections.forEach((sec, sIdx) => {
        if (separateWithHeaders) {
          const bannerCells = [];
          for (let c = 1; c <= lastColIdx; c++) {
            bannerCells.push(makeCell(`${getColumnName(c)}${currentRow}`, c === 1 ? (sec.title || "Hisobot") : "", c === 1 ? 2 : 31));
          }
          worksheetRows.push(`<row r="${currentRow}" ht="36" customHeight="1">${bannerCells.join("")}</row>`);
          mergeCellsList.push(`A${currentRow}:${lastColumnName}${currentRow}`);
          currentRow += 1;
        }

        // Header row
        const secCols = sec.columns || allCols;
        const headerCells = secCols.map((h, i) => makeCell(`${getColumnName(i + 1)}${currentRow}`, h, 1));
        worksheetRows.push(`<row r="${currentRow}" ht="28" customHeight="1">${headerCells.join("")}</row>`);
        currentRow += 1;

        // Data rows
        (sec.rows || []).forEach((rowVals, rIdx) => {
          const isZebra = rIdx % 2 === 1;
          const dataCells = secCols.map((h, i) => {
            const val = rowVals[i];
            const style = getTableDataStyle(h, val, isZebra);
            return makeCell(`${getColumnName(i + 1)}${currentRow}`, val, style);
          });
          worksheetRows.push(`<row r="${currentRow}" ht="22" customHeight="1">${dataCells.join("")}</row>`);
          currentRow += 1;
        });

        if (sIdx < sections.length - 1) {
          worksheetRows.push(`<row r="${currentRow}" ht="18" customHeight="1"/>`);
          currentRow += 1;
        }
      });

      lastRow = currentRow - 1;
    }
  } else {
    // SINGLE SECTION
    const hasSummary = Array.isArray(summary) && summary.length > 0;
    const hasTable =
      Array.isArray(columns) &&
      columns.length > 0 &&
      Array.isArray(rows) &&
      rows.length > 0;

    if (hasSummary && !hasTable) {
      // ONLY Summary Report (Single)
      const maxLabelLen = Math.max(
        ...summary.map(([label]) => String(label ?? "").length),
        25,
      );
      const colAWidth = Math.min(Math.max(maxLabelLen + 6, 38), 50);
      const colBWidth = 28;

      colsXml = `<col min="1" max="1" width="${colAWidth}" customWidth="1"/><col min="2" max="2" width="${colBWidth}" customWidth="1"/>`;
      lastColumnName = "B";
      lastRow = summary.length + 1;

      // Row 1: Merged Title Banner
      const bannerTitle = title || "Hisobot";
      worksheetRows.push(
        `<row r="1" ht="36" customHeight="1">${makeCell("A1", bannerTitle, 2)}${makeCell("B1", "", 31)}</row>`,
      );

      summary.forEach(([label, value], index) => {
        const rowNumber = index + 2;
        const isZebra = index % 2 === 1;
        const labelStyle = isZebra ? 4 : 3;
        const valueStyle = getSummaryValueStyle(label, value, isZebra);

        worksheetRows.push(
          `<row r="${rowNumber}" ht="24" customHeight="1">${makeCell(`A${rowNumber}`, label, labelStyle)}${makeCell(`B${rowNumber}`, value, valueStyle)}</row>`,
        );
      });

      mergeCellsList.push("A1:B1");
    } else {
      // Normal Data Table
      const cols = columns || [];
      const rws = rows || [];
      const tableHeaderRow = 1;
      lastRow = tableHeaderRow + rws.length;
      const lastColIndex = Math.max(cols.length, 1);
      lastColumnName = getColumnName(lastColIndex);

      const widths = cols.map((heading, columnIndex) => {
        const headingStr = String(heading || "");
        const largestCell = Math.max(
          headingStr.length,
          ...rws.map((row) => {
            const val = row[columnIndex];
            if (val instanceof Date) return 12;
            if (typeof val === "number") return val.toLocaleString().length + 4;
            return String(val ?? "").length;
          }),
        );
        let minW = 10;
        if (headingStr === "$") minW = 8;
        else if (/sana|date/i.test(headingStr)) minW = 13;
        else if (/narxi|umumiy|so'?m/i.test(headingStr)) minW = 18;
        else if (/nomi|name/i.test(headingStr)) minW = 32;
        return Math.min(Math.max(largestCell + 3, minW), 45);
      });

      colsXml = widths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
        )
        .join("");

      // Row 1: Table headers
      const headerCells = cols.map((heading, index) =>
        makeCell(`${getColumnName(index + 1)}1`, heading, 1),
      );
      worksheetRows.push(
        `<row r="1" ht="28" customHeight="1">${headerCells.join("")}</row>`,
      );

      // Rows 2+: Data rows
      rws.forEach((values, rowIndex) => {
        const rowNumber = rowIndex + 2;
        const isZebra = rowIndex % 2 === 1;
        const cells = cols.map((heading, columnIndex) => {
          const value = values[columnIndex];
          const style = getTableDataStyle(heading, value, isZebra);
          return makeCell(`${getColumnName(columnIndex + 1)}${rowNumber}`, value, style);
        });
        worksheetRows.push(
          `<row r="${rowNumber}" ht="22" customHeight="1">${cells.join("")}</row>`,
        );
      });

      autoFilterXml = `<autoFilter ref="A1:${lastColumnName}${Math.max(lastRow, 1)}"/>`;
      paneXml = `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>`;
    }
  }

  const mergeCellsXml =
    mergeCellsList.length > 0
      ? `<mergeCells count="${mergeCellsList.length}">${mergeCellsList.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
      : "";

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumnName}${Math.max(lastRow, 1)}"/>
  <sheetViews>
    <sheetView showGridLines="1" workbookViewId="0">
      ${paneXml}
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${worksheetRows.join("")}</sheetData>
  ${autoFilterXml}
  ${mergeCellsXml}
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const nowIso = new Date().toISOString();

  const workbookFiles = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>OfficeReport</dc:creator>
  <cp:lastModifiedBy>OfficeReport</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>Report</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="10000"/>
  <workbookPr date1904="false"/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="25600" windowHeight="14400"/>
  </bookViews>
  <sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/styles.xml": getStyles(),
    "xl/worksheets/sheet1.xml": worksheetXml,
  };

  const { strToU8: encodeXml, zipSync } = await import("fflate");
  const archive = zipSync(
    Object.fromEntries(
      Object.entries(workbookFiles).map(([path, content]) => [
        path,
        encodeXml(content),
      ]),
    ),
    { level: 6 },
  );
  const blob = new Blob([archive], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(fileName)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

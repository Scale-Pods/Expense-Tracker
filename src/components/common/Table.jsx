import React from 'react';
import clsx from 'clsx';
import '../../styles/table.css';

const Table = ({ columns, data, onRowClick, className }) => {
  return (
    <div className={clsx('table-container', className)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index} 
                className={clsx(col.className, col.align && `text-${col.align}`)} 
                style={col.style}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr 
                key={row.id || rowIndex} 
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'clickable' : ''}
              >
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={clsx(col.className, col.align && `text-${col.align}`)}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="no-data">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;

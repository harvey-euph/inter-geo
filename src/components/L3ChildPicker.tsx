import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { findL3Partition } from '../data/l3Manifest';
import { loadL3Children } from '../data/l3ChildList';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';

interface L3ChildPickerProps {
  subdivision: L2SubdivisionDetail;
  onSelect: (municipality: MunicipalityDetail) => void;
}

function childLabel(item: MunicipalityDetail): string {
  return item.city || item.nameZh || item.code;
}

/**
 * Opens the next admin level as a clickable list. Does not move the camera by itself.
 */
export const L3ChildPicker: React.FC<L3ChildPickerProps> = ({ subdivision, onSelect }) => {
  const partition = useMemo(
    () =>
      findL3Partition(subdivision.iso2, {
        id: subdivision.id,
        code: subdivision.code,
        name: subdivision.name,
        nameEn: subdivision.nameEn,
        nameZh: subdivision.nameZh
      }),
    [subdivision]
  );
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MunicipalityDetail[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open || rows || !partition) return;
    let cancelled = false;
    setError(false);
    loadL3Children(subdivision.iso2, {
      id: subdivision.id,
      code: subdivision.code,
      name: subdivision.name,
      nameEn: subdivision.nameEn,
      nameZh: subdivision.nameZh
    })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, rows, partition, subdivision]);

  if (!partition) return null;

  const query = filter.trim().toLowerCase();
  const visible = (rows || []).filter((item) => {
    if (!query) return true;
    const blob = `${childLabel(item)} ${item.nameZh} ${item.code} ${item.typeEn || ''}`.toLowerCase();
    return blob.includes(query);
  });
  const count = rows ? rows.length : partition.subdivisionCount;

  return (
    <div className="l3-child-picker">
      <button
        type="button"
        className="btn-primary l3-child-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown size={16} className={open ? 'l3-child-chevron open' : 'l3-child-chevron'} />
        <span>下一級行政區（{count}）</span>
      </button>

      {open && (
        <div className="l3-child-panel">
          {error && <div className="l3-child-status">無法載入下一級行政區</div>}
          {!error && !rows && <div className="l3-child-status">載入下一級行政區…</div>}
          {rows && rows.length === 0 && <div className="l3-child-status">沒有下一級行政區</div>}
          {rows && rows.length > 12 && (
            <input
              className="l3-child-search"
              value={filter}
              placeholder="搜尋名稱"
              onChange={(event) => setFilter(event.target.value)}
            />
          )}
          {rows && rows.length > 0 && (
            <ul className="l3-child-list">
              {visible.map((item) => {
                const label = childLabel(item);
                const alt = item.nameZh && item.nameZh !== label ? item.nameZh : '';
                return (
                  <li key={`${item.code}:${label}`}>
                    <button type="button" className="l3-child-item" onClick={() => onSelect(item)}>
                      <span className="l3-child-name">
                        {label}
                        {alt ? <span className="l3-child-alt">{alt}</span> : null}
                      </span>
                      {item.typeEn ? <span className="l3-child-type">{item.typeEn}</span> : null}
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="l3-child-status">沒有符合的行政區</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

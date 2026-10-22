import React from 'react';
import type { RoadShieldType } from '../data/roadsMeta';
export type { RoadShieldType } from '../data/roadsMeta';

interface RoadShieldBadgeProps {
  type: RoadShieldType;
  label?: string;
  size?: number;
  active?: boolean;
}

export const RoadShieldBadge: React.FC<RoadShieldBadgeProps> = ({
  type,
  label,
  size = 24,
  active = false
}) => {
  switch (type) {
    case 'interstate':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer shield boundary */}
          <path
            d="M 2 4 C 2 3 4 2 6 2 L 18 2 C 20 2 22 3 22 4 L 22 13 C 22 18.5 12 23 12 23 C 12 23 2 18.5 2 13 Z"
            fill="#1e3a8a"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          {/* Red top crown */}
          <path
            d="M 2.6 4 C 2.6 3.2 4.2 2.6 6 2.6 L 18 2.6 C 19.8 2.6 21.4 3.2 21.4 4 L 21.4 8.5 L 2.6 8.5 Z"
            fill="#dc2626"
          />
          <text
            x="12"
            y="7.2"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="4.2"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            letterSpacing="-0.2px"
          >
            I-
          </text>
          <text
            x="12"
            y="17.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || '90'}
          </text>
        </svg>
      );

    case 'us-route':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* White cutout shield */}
          <path
            d="M 3 3.5 C 3 2.5 5.5 2 8 2 L 16 2 C 18.5 2 21 2.5 21 3.5 C 21 12 20.5 16 12 22.5 C 3.5 16 3 12 3 3.5 Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          <text
            x="12"
            y="8.5"
            textAnchor="middle"
            fill="#0f172a"
            fontSize="4.5"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            US
          </text>
          <text
            x="12"
            y="17.5"
            textAnchor="middle"
            fill="#0f172a"
            fontSize="8"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || '66'}
          </text>
        </svg>
      );

    case 'autobahn':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Blue German Autobahn sign */}
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
          {/* Two road converging lines and overpass */}
          <path d="M 5 20 L 9.5 8 L 14.5 8 L 19 20" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 7 11.5 L 17 11.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 12 14 L 12 18" stroke="#ffffff" strokeWidth="1" strokeDasharray="1.5 1.5" />
        </svg>
      );

    case 'bundesstrasse':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Yellow German Federal Road sign */}
          <rect x="2" y="3" width="20" height="18" rx="3" fill="#fbbf24" stroke="#000000" strokeWidth="1.4" />
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="#000000"
            fontSize="10"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'B'}
          </text>
        </svg>
      );

    case 'jp-expressway':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Green Japanese expressway sign */}
          <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#15803d" stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="12"
            y="9.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="5"
            fontWeight="800"
            fontFamily="sans-serif"
          >
            高速
          </text>
          <text
            x="12"
            y="18.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'E'}
          </text>
        </svg>
      );

    case 'jp-national':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Blue Japanese National Highway inverted triangle */}
          <path
            d="M 3.5 3 C 2.5 3 2 4 2.5 5 L 11 21 C 11.5 22 12.5 22 13 21 L 21.5 5 C 22 4 21.5 3 20.5 3 Z"
            fill="#0284c7"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <text
            x="12"
            y="9.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="5"
            fontWeight="800"
            fontFamily="sans-serif"
          >
            国道
          </text>
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || '1'}
          </text>
        </svg>
      );

    case 'tw-freeway':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Taiwan 5-petal plum blossom flower shield (梅花標誌) */}
          <circle cx="12" cy="7" r="4.2" fill="#15803d" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="16.5" cy="11.5" r="4.2" fill="#15803d" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="15" cy="17" r="4.2" fill="#15803d" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="9" cy="17" r="4.2" fill="#15803d" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="7.5" cy="11.5" r="4.2" fill="#15803d" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="12" cy="12.5" r="4.5" fill="#15803d" />
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || '國'}
          </text>
        </svg>
      );

    case 'tw-provincial':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Taiwan Provincial Highway Blue/Red shield */}
          <path
            d="M 4 3 C 4 2.5 6 2 8 2 L 16 2 C 18 2 20 2.5 20 3 C 20 12 18 16 12 22 C 6 16 4 12 4 3 Z"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <text
            x="12"
            y="15"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            {label || '台'}
          </text>
        </svg>
      );

    case 'gb-motorway':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Blue British Motorway box */}
          <rect x="2" y="3" width="20" height="18" rx="3.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'M'}
          </text>
        </svg>
      );

    case 'gb-aroad':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Green British A-Road box */}
          <rect x="2" y="3" width="20" height="18" rx="3.5" fill="#047857" stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="11"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'A'}
          </text>
        </svg>
      );

    case 'fr-autoroute':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Blue French Autoroute with red top cartouche */}
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
          <rect x="5" y="4" width="14" height="7" rx="2" fill="#dc2626" />
          <text
            x="12"
            y="9.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="6"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            A
          </text>
          <text
            x="12"
            y="18.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || '6'}
          </text>
        </svg>
      );

    case 'e-road':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Green European E-Road rectangle */}
          <rect x="2" y="4" width="20" height="16" rx="3" fill="#059669" stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'E'}
          </text>
        </svg>
      );

    case 'generic-expressway':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 3 4 C 3 2.5 5 2 8 2 L 16 2 C 19 2 21 2.5 21 4 C 21 12 19 16 12 22 C 5 16 3 12 3 4 Z"
            fill={active ? '#0284c7' : '#1e293b'}
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
          <text
            x="12"
            y="14.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            {label || 'HW'}
          </text>
        </svg>
      );
  }
};

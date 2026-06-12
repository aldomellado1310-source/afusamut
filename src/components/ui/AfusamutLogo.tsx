import React from 'react';

interface AfusamutLogoProps {
  className?: string;
}

export default function AfusamutLogo({ className = 'w-16 h-16' }: AfusamutLogoProps) {
  return (
    <svg viewBox="0 0 500 550" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M250 20 C 380 20,460 60,460 180 C 460 330,360 450,250 520 C 140 450,40 330,40 180 C 40 60,120 20,250 20 Z"
        fill="#0F5132" stroke="#D1A126" strokeWidth="15" strokeLinejoin="round"/>
      <path d="M250 35 C 365 35,440 72,440 180 C 440 315,345 430,250 495 C 155 430,60 315,60 180 C 60 72,135 35,250 35 Z"
        fill="#0A3622" stroke="#F3CD5F" strokeWidth="4"/>
      <path d="M 68 175 C 120 160,380 160,432 175 C 440 140,440 100,430 70 C 370 50,290 45,250 45 C 210 45,130 50,70 70 C 60 100,60 140,68 175 Z"
        fill="#062416"/>
      <text x="250" y="85" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="system-ui,sans-serif" letterSpacing="6">AFUSAMUT</text>
      <text x="250" y="132" textAnchor="middle" fill="#F3CD5F" fontSize="46" fontWeight="900" fontFamily="system-ui,sans-serif" letterSpacing="4">SAMU</text>
      <text x="250" y="158" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="5">TALCAHUANO</text>
      <path d="M 61 178 C 150 160,350 160,439 178 L 440 260 C 350 240,150 240,60 260 Z" fill="#FFFDF4"/>
      <g transform="translate(250,285) scale(1.15)">
        <path d="M-15,-75 L15,-75 L20,-30 L65,-55 L80,-30 L35,-5 L75,25 L55,50 L15,20 L15,70 L-15,70 L-15,20 L-55,50 L-75,25 L-35,-5 L-80,-30 L-65,-55 L-20,-30 Z"
          fill="#0D6EFD" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="miter"/>
        <path d="M0,-55 L0,55" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round"/>
        <path d="M -12,35 C -25,20 0,10 0,-5 C 0,-20 -20,-25 -5,-40 C 5,-50 15,-30 1,-20 C -10,-10 12,5 5,20 C 0,30 -5,30 -10,35"
          stroke="#FFFDF4" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <g transform="translate(105,330) rotate(-15) scale(0.8)">
        <path d="M0,120 Q-20,60 0,0" stroke="#F3CD5F" strokeWidth="4" fill="none"/>
        {[10, 30, 50, 70, 90].map(y => (
          <React.Fragment key={y}>
            <path d={`M0,${y} Q-18,${y - 10} -8,${y - 20} Q2,${y - 20} 0,${y}`} fill="#F3CD5F"/>
            <path d={`M0,${y} Q18,${y - 10} 8,${y - 20} Q-2,${y - 20} 0,${y}`} fill="#F3CD5F"/>
          </React.Fragment>
        ))}
      </g>
      <g transform="translate(395,330) rotate(15) scale(0.8) translate(-10,0)">
        <path d="M0,120 Q20,60 0,0" stroke="#F3CD5F" strokeWidth="4" fill="none"/>
        {[10, 30, 50, 70, 90].map(y => (
          <React.Fragment key={y}>
            <path d={`M0,${y} Q18,${y - 10} 8,${y - 20} Q-2,${y - 20} 0,${y}`} fill="#F3CD5F"/>
            <path d={`M0,${y} Q-18,${y - 10} -8,${y - 20} Q2,${y - 20} 0,${y}`} fill="#F3CD5F"/>
          </React.Fragment>
        ))}
      </g>
      <g transform="translate(160,420) scale(1.1)">
        <path d="M10,45 L-10,25 L-2,15 L18,35 Z" fill="#FFFFFF"/>
        <path d="M5,50 L-15,30 L-8,22 L12,42 Z" fill="#0A3622"/>
        <path d="M150,45 L170,25 L162,15 L142,35 Z" fill="#FFFFFF"/>
        <path d="M155,50 L175,30 L168,22 L148,42 Z" fill="#0A3622"/>
        <path d="M2,21 C15,15 35,5 50,15 C55,18 52,25 45,28 C35,32 15,32 2,21 Z" fill="#ECA17B"/>
        <path d="M158,21 C145,15 125,5 110,15 C105,18 108,25 115,28 C125,32 145,32 158,21 Z" fill="#ECA17B"/>
        <path d="M45,22 C55,10 105,10 115,22 C118,25 115,38 105,42 C95,45 65,45 55,42 C45,38 42,25 45,22 Z" fill="#D78A63"/>
        <path d="M60,18 C70,12 90,12 100,18" stroke="#AE603B" strokeWidth="3" strokeLinecap="round"/>
        <path d="M72,22 C75,25 75,32 72,35 M78,21 C81,24 81,31 78,34 M84,21 C87,24 87,31 84,34 M90,22 C93,25 93,32 90,35"
          stroke="#AE603B" strokeWidth="3" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

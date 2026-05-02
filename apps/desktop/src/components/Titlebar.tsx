import React from "react";
import { Icon } from "./Icon";
import { useCompany } from "../context/CompanyContext";

interface TitlebarProps {
  page?: string;
}

export function Titlebar({ page = "Dashboard" }: TitlebarProps) {
  const { company } = useCompany();
  const pageLabel = page.charAt(0).toUpperCase() + page.slice(1);
  const companyName = company?.name || "Paperclip";
  return (
    <div className="titlebar">
      <div className="traffic">
        <div className="dot red" />
        <div className="dot amber" />
        <div className="dot green" />
      </div>
      <div className="titlebar-title">Paperclip — {companyName} · {pageLabel}</div>
      <div className="titlebar-actions">
        <button className="tb-btn"><Icon name="search" size={12} /> Search <span className="kbd-inline">⌘K</span></button>
        <button className="tb-btn"><Icon name="bell" size={12} /></button>
      </div>
    </div>
  );
}

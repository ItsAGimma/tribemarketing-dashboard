"use client";

import { useState } from "react";
import { Search, FileText, Calendar } from "lucide-react";
import Tabs from "@/components/Tabs";
import SeoChecker from "./components/SeoChecker";
import ZoekwoordenOnderzoek from "./components/ZoekwoordenOnderzoek";
import ContentKalender from "./components/ContentKalender";

const tabs = [
  { id: "seo", label: "SEO Checker", icon: Search },
  { id: "zoekwoorden", label: "Zoekwoorden", icon: FileText },
  { id: "kalender", label: "Content Kalender", icon: Calendar },
];

export default function ContentPage() {
  const [actieveTab, setActieveTab] = useState("seo");

  return (
    <div>
      <h1 className="page-title">Content Hub</h1>

      <Tabs tabs={tabs} active={actieveTab} onChange={setActieveTab} className="mb-8" />

      {actieveTab === "seo" && <SeoChecker />}
      {actieveTab === "zoekwoorden" && <ZoekwoordenOnderzoek />}
      {actieveTab === "kalender" && <ContentKalender />}
    </div>
  );
}

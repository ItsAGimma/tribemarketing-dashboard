"use client";

import { useState } from "react";
import { BarChart2, Car, ClipboardList, FileText } from "lucide-react";
import Tabs from "@/components/Tabs";
import BtwOverzicht from "./components/BtwOverzicht";
import Facturen from "./components/Facturen";
import Jaaroverzicht from "./components/Jaaroverzicht";
import Kilometers from "./components/Kilometers";

const tabs = [
  { id: "jaaroverzicht", label: "Jaaroverzicht", icon: BarChart2 },
  { id: "kilometers", label: "Kilometers", icon: Car },
  { id: "btw", label: "BTW", icon: ClipboardList },
  { id: "facturen", label: "Facturen", icon: FileText },
];

export default function BelastingenPage() {
  const [actieveTab, setActieveTab] = useState("jaaroverzicht");

  return (
    <div>
      <h1 className="page-title">Belastingen</h1>

      <Tabs tabs={tabs} active={actieveTab} onChange={setActieveTab} className="mb-8" />

      {actieveTab === "jaaroverzicht" && <Jaaroverzicht />}
      {actieveTab === "kilometers" && <Kilometers />}
      {actieveTab === "btw" && <BtwOverzicht />}
      {actieveTab === "facturen" && <Facturen />}
    </div>
  );
}

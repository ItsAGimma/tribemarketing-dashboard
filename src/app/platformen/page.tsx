"use client";

import { useState } from "react";
import { Globe, Link2 } from "lucide-react";
import Tabs from "@/components/Tabs";
import AffiliatePlatforms from "@/app/content/components/AffiliatePlatforms";
import AffiliateLinkManager from "@/app/content/components/AffiliateLinkManager";

const tabs = [
  { id: "platforms", label: "Platforms", icon: Globe },
  { id: "links", label: "Affiliate Links", icon: Link2 },
];

export default function PlatformenPage() {
  const [actieveTab, setActieveTab] = useState("platforms");

  return (
    <div>
      <h1 className="page-title">Platformen</h1>
      <Tabs tabs={tabs} active={actieveTab} onChange={setActieveTab} className="mb-8" />
      {actieveTab === "platforms" && <AffiliatePlatforms />}
      {actieveTab === "links" && <AffiliateLinkManager />}
    </div>
  );
}

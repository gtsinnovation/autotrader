import React, { useState } from "react";
import TopBar from "@/components/analysis/TopBar";
import HeroHeader from "@/components/analysis/HeroHeader";
import FeatureMatrix from "@/components/analysis/FeatureMatrix";
import GapRadar from "@/components/analysis/GapRadar";
import ImpactList from "@/components/analysis/ImpactList";
import RecommendationCard from "@/components/analysis/RecommendationCard";
import IntegrationPreviewer from "@/components/analysis/IntegrationPreviewer";
import { recommendations } from "@/data/analysis";

export default function Home() {
  const [activeId, setActiveId] = useState(recommendations[0].id);

  const preview = (id) => {
    setActiveId(id);
    document.getElementById("previewer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <TopBar />
      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div className="grid gap-5 lg:grid-cols-10">
          <aside className="space-y-5 lg:col-span-3">
            <GapRadar />
            <ImpactList />
            <FeatureMatrix />
          </aside>

          <div className="space-y-5 lg:col-span-7">
            <HeroHeader />
            <div className="grid gap-5 xl:grid-cols-2">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} onPreview={preview} />
              ))}
            </div>
            <IntegrationPreviewer activeId={activeId} onSelect={setActiveId} />
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
        <button
          onClick={() => preview(activeId)}
          className="w-full rounded-[4px] bg-primary py-3 font-display text-[0.8125rem] font-700 text-primary-foreground"
        >
          GENERATE PATCH SCRIPT
        </button>
      </div>
    </div>
  );
}
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, TableProperties, AlertCircle, ShieldCheck, Upload, Lightbulb } from "lucide-react";
import { useRef } from "react";
import { loadFromFile, saveEntries } from "../services/testData";

interface Props {
  onDataLoaded?: () => void;
}

const NAV = [
  { to: "/",        icon: BarChart3,        label: "Dashboard" },
  { to: "/insights",icon: Lightbulb,        label: "Insights" },
  { to: "/results", icon: TableProperties,  label: "Test Results" },
  { to: "/findings",icon: AlertCircle,      label: "Findings" },
];

export default function Layout({ onDataLoaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const entries = await loadFromFile(file);
      saveEntries(entries, {
        filename: file.name,
        loadedAt: new Date().toISOString(),
        count: entries.length,
      });
      onDataLoaded?.();
      window.location.reload();
    } catch {
      alert("Failed to parse file. Ensure it is a valid evaluation JSONL.");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        {/* Branding */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">InsureMatrixAI</div>
            <div className="text-xs text-gray-500 mt-0.5">AI Agent Evaluation</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 border border-blue-600/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Upload */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-2 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload JSONL
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".jsonl,.json,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-xs text-gray-600 leading-relaxed">
            Load a new <code className="text-gray-500">evaluation_results_*.jsonl</code> file to update results.
          </p>
        </div>
      </aside>

      {/* Page */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

import { useState } from "react";

type TabOption = "optionOne" | "optionTwo" | "optionThree";

/**
 * ChartTab - Toggle between Monthly / Quarterly / Annually.
 *
 * Decorative component for dashboard chart headers.
 * Currently does NOT filter chart data — it only manages visual state.
 * See TECH_DEBT.md for planned callback support.
 * @kgId 32649343a4a8
 */
const ChartTab: React.FC = () => {
  const [selected, setSelected] = useState<TabOption>("optionOne");

  const getButtonClass = (option: TabOption) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => setSelected("optionOne")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionOne")}`}
      >
        Monthly
      </button>
      <button
        onClick={() => setSelected("optionTwo")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionTwo")}`}
      >
        Quarterly
      </button>
      <button
        onClick={() => setSelected("optionThree")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionThree")}`}
      >
        Annually
      </button>
    </div>
  );
};

export default ChartTab;

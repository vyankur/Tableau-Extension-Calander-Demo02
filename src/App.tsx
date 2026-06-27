import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Calendar } from "./Calendar";
import { ConfigDialog } from "./ConfigDialog";
import { Controls } from "./Controls";
import { defaultSettings, ExtensionSettings, normalizeSettings, readSettingsFromTableau, saveSettingsToTableau } from "./settings";
import { AttributeFilter, CalendarDataPoint, filterAttribute, filterDay, initializeTableau, loadSummaryCalendarData, WorksheetField } from "./tableau";

export default function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings);
  const [points, setPoints] = useState<CalendarDataPoint[]>([]);
  const [fields, setFields] = useState<WorksheetField[]>([]);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isTableauReady, setIsTableauReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async (activeSettings: ExtensionSettings) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadSummaryCalendarData(activeSettings);
      setPoints(result.points);
      setFields(result.fields);
      setWorksheets(result.worksheets);
      setYears(result.years);
      setAttributeFilters(result.attributeFilters);
      setWarnings(result.warnings);
      if (result.years.length) {
        const dataYear = activeSettings.selectedYear && result.years.includes(activeSettings.selectedYear) ? activeSettings.selectedYear : result.years[0];
        const nextSettings = normalizeSettings({
          ...activeSettings,
          worksheetName: activeSettings.worksheetName || result.selectedWorksheetName,
          selectedYear: dataYear
        });

        setSettings(nextSettings);
        if (JSON.stringify(nextSettings) !== JSON.stringify(activeSettings)) {
          await saveSettingsToTableau(nextSettings);
        }
      } else if (!activeSettings.worksheetName && result.selectedWorksheetName) {
        setSettings((current) =>
          normalizeSettings({
            ...current,
            worksheetName: current.worksheetName || result.selectedWorksheetName,
            selectedYear: null
          })
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to read Tableau summary data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    initializeTableau(() => setIsConfigOpen(true))
      .then((ready) => {
        if (!mounted) return;
        setIsTableauReady(ready);
        const loadedSettings = ready ? readSettingsFromTableau() : defaultSettings;
        setSettings(loadedSettings);
        return ready ? refreshData(loadedSettings) : undefined;
      })
      .catch((initializationError) => {
        if (!mounted) return;
        setError(initializationError instanceof Error ? initializationError.message : "Tableau initialization failed.");
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshData]);

  const handleSaveSettings = async (nextSettings: ExtensionSettings) => {
    setSettings(nextSettings);
    setIsConfigOpen(false);
    if (isTableauReady) await saveSettingsToTableau(nextSettings);
    await refreshData(nextSettings);
  };

  const handleViewerSettingsChange = async (nextSettings: ExtensionSettings) => {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    if (isTableauReady) await saveSettingsToTableau(normalized);
  };

  const handleAttributeFilterChange = async (fieldName: string, value: string) => {
    const nextSettings = normalizeSettings({
      ...settings,
      attributeFilters: {
        ...settings.attributeFilters,
        [fieldName]: value
      }
    });

    if (!value) {
      delete nextSettings.attributeFilters[fieldName];
    }

    setSettings(nextSettings);
    setError(null);
    try {
      await filterAttribute(settings, fieldName, value);
      if (isTableauReady) await saveSettingsToTableau(nextSettings);
      await refreshData(nextSettings);
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "Unable to apply Tableau attribute filter.");
    }
  };

  const handleDayClick = async (isoDate: string, filterValue: string) => {
    try {
      await filterDay(settings, isoDate, filterValue);
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "Unable to apply Tableau date filter.");
    }
  };

  if (!isTableauReady && !error) {
    return (
      <main className="app-state">
        <h1>Extension01</h1>
        <p>Open this page from Tableau using the `.trex` manifest.</p>
      </main>
    );
  }

  return (
    <main className="app-root">
      <button className="config-launch" type="button" onClick={() => setIsConfigOpen(true)} title="Configure extension" aria-label="Configure extension">
        <Settings size={18} />
      </button>

      {isLoading ? <div className="app-state">Loading Tableau summary data...</div> : null}
      {error ? <div className="app-alert">{error}</div> : null}
      {warnings.length ? (
        <div className="app-warning">
          {warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}

      {!isLoading ? (
        <>
          <Controls
            settings={settings}
            years={years}
            attributeFilters={attributeFilters}
            onSettingsChange={handleViewerSettingsChange}
            onAttributeFilterChange={handleAttributeFilterChange}
          />
          <Calendar points={points} settings={settings} onDayClick={handleDayClick} />
        </>
      ) : null}

      <ConfigDialog
        open={isConfigOpen}
        settings={settings}
        fields={fields}
        worksheets={worksheets}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleSaveSettings}
      />
    </main>
  );
}

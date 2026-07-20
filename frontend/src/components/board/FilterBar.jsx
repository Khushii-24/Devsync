import { useSearchParams } from 'react-router-dom';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function FilterBar({ members, allLabels }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const assignee = searchParams.get('assignee') || '';
  const priority = searchParams.get('priority') || '';
  const label = searchParams.get('label') || '';

  // Generic setter: updates one param, leaves the others untouched.
  // Deleting the key (instead of setting it to '') when cleared keeps the URL
  // clean — you get `?priority=high` not `?assignee=&priority=high&label=`.
  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function clearAll() {
    setSearchParams({});
  }

  const hasActiveFilters = assignee || priority || label;

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <select
        value={assignee}
        onChange={(e) => setParam('assignee', e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All assignees</option>
        {members?.map((m) => (
          <option key={m.user_id} value={m.user_id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{m.name || m.email}</option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(e) => setParam('priority', e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{p}</option>
        ))}
      </select>

      <select
        value={label}
        onChange={(e) => setParam('label', e.target.value)}
        className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All labels</option>
        {allLabels.map((l) => (
          <option key={l} value={l} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{l}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

export default FilterBar;
import { useState } from 'react';
import { getShoppingList } from '../lib/api';
import moment from 'moment';
import { CheckSquare, Square } from 'lucide-react';

const ShoppingListPage = () => {
    const [startDate, setStartDate] = useState(moment().startOf('week').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('week').format('YYYY-MM-DD'));
    const [shoppingList, setShoppingList] = useState<string[]>([]);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const handleGenerateList = async () => {
        setLoading(true);
        const list = await getShoppingList(startDate, endDate);
        setShoppingList(list);
        setCheckedItems(new Set());
        setLoading(false);
    };

    const handleItemToggle = (item: string) => {
        const newCheckedItems = new Set(checkedItems);
        if (newCheckedItems.has(item)) {
            newCheckedItems.delete(item);
        } else {
            newCheckedItems.add(item);
        }
        setCheckedItems(newCheckedItems);
    };

    return (
        <div className="p-4 md:p-8 lg:px-12">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 mb-8">Shopping List</h1>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                    <div className="w-full md:w-auto">
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                    </div>
                    <div className="w-full md:w-auto">
                        <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                    </div>
                    <button onClick={handleGenerateList} className="bg-rose-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-700 transition-colors self-end w-full md:w-auto shadow-md">
                        {loading ? 'Generating...' : 'Generate List'}
                    </button>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Your List</h2>
                    <ul className="space-y-2">
                        {shoppingList.map((item, index) => (
                            <li key={index} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors" onClick={() => handleItemToggle(item)}>
                                {checkedItems.has(item) ? <CheckSquare className="text-emerald-600 dark:text-emerald-500" /> : <Square className="text-slate-400" />}
                                <span className={`text-lg ${checkedItems.has(item) ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ShoppingListPage;

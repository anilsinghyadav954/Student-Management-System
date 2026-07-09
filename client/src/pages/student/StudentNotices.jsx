import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiBell,  FiBookmark } from "react-icons/fi";
import { noticeService } from "../../services/noticeService";
import Loader from "../../components/ui/Loader.jsx";
import Badge from "../../components/ui/Badge.jsx";

const StudentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const { data } = await noticeService.getMine();
        setNotices(data.data);
      } catch (error) {
        toast.error("Failed to load notices");
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Announcements from your school administration</p>
      </div>

      {notices.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <FiBell className="text-3xl text-slate-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No notices right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice._id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                {notice.isPinned && <FiBookmark className="text-primary-600 dark:text-primary-400" size={14} />}
                <h3 className="font-semibold text-slate-900 dark:text-white break-words">{notice.title}</h3>
                <Badge status={notice.priority}>{notice.priority}</Badge>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{notice.description}</p>
              <p className="mt-2 text-xs text-slate-400">
                By {notice.postedBy?.name} · {new Date(notice.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentNotices;

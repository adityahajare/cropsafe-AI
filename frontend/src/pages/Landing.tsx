import { useNavigate } from "react-router-dom";
import { Leaf, Sprout, UserCog, UserRound } from "lucide-react";
import heroFarm from "@/assets/hero-farm.jpg";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7faf3] text-slate-900">
      <section className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroFarm})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-emerald-950/55 to-black/20" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6">
          <header>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white"
              aria-label="CropSafe home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                <Leaf className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold">CropSafe</span>
            </button>
          </header>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.8fr]">
            <div className="text-white">
              <h1 className="max-w-2xl text-5xl font-extrabold leading-tight md:text-7xl">
                CropSafe
              </h1>
              <p className="mt-4 text-xl text-emerald-50 md:text-2xl">
                Choose your role to continue.
              </p>
            </div>

            <div className="grid gap-4">
              <button
                onClick={() => navigate("/login?role=farmer")}
                className="rounded-lg bg-white/95 p-6 text-left shadow-2xl ring-1 ring-white/60 transition hover:-translate-y-1 hover:bg-white"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                    <UserRound className="h-6 w-6" />
                  </span>
                  <h2 className="text-2xl font-bold text-emerald-950">Farmer</h2>
                </div>
              </button>

              <button
                onClick={() => navigate("/login?role=admin")}
                className="rounded-lg bg-slate-950/90 p-6 text-left text-white shadow-2xl ring-1 ring-white/15 transition hover:-translate-y-1 hover:bg-slate-900"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-emerald-200">
                    <UserCog className="h-6 w-6" />
                  </span>
                  <h2 className="text-2xl font-bold">Admin</h2>
                </div>
              </button>

              <button
                onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-950/20 hover:bg-emerald-400"
              >
                <Sprout className="h-5 w-5" />
                New Farmer Registration
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

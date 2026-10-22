#include <gdal/ogrsf_frmts.h>

#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>

static std::string escapeJson(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);

    for (unsigned char c : s) {
        switch (c) {
        case '"':  out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\b': out += "\\b";  break;
        case '\f': out += "\\f";  break;
        case '\n': out += "\\n";  break;
        case '\r': out += "\\r";  break;
        case '\t': out += "\\t";  break;
        default:
            if (c < 0x20) {
                static constexpr char hex[] = "0123456789abcdef";
                out += "\\u00";
                out += hex[c >> 4];
                out += hex[c & 15];
            } else {
                out += static_cast<char>(c);
            }
        }
    }

    return out;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: fgb_dump file.fgb [limit]\n";
        return 1;
    }

    GDALAllRegister();

    auto* raw = static_cast<GDALDataset*>(
        GDALOpenEx(argv[1],
                   GDAL_OF_VECTOR | GDAL_OF_READONLY,
                   nullptr, nullptr, nullptr));

    if (!raw) {
        std::cerr << "Cannot open file\n";
        return 1;
    }

    std::unique_ptr<GDALDataset, decltype(&GDALClose)>
        ds(raw, GDALClose);

    OGRLayer* layer = ds->GetLayer(0);
    if (!layer) return 1;

    const long long limit =
        argc >= 3 ? std::atoll(argv[2]) : -1;

    OGRFeatureDefn* defn = layer->GetLayerDefn();

    std::cout << "{\"type\":\"FeatureCollection\",\"features\":[";

    long long count = 0;
    OGRFeature* rawFeature = nullptr;

    while ((limit < 0 || count < limit) &&
           (rawFeature = layer->GetNextFeature()) != nullptr) {
        std::unique_ptr<OGRFeature, decltype(&OGRFeature::DestroyFeature)>
            f(rawFeature, OGRFeature::DestroyFeature);

        if (count++) std::cout << ',';

        std::cout << "{\"type\":\"Feature\",\"properties\":{";

        for (int i = 0; i < defn->GetFieldCount(); ++i) {
            if (i) std::cout << ',';

            const char* name = defn->GetFieldDefn(i)->GetNameRef();
            std::cout << '"' << escapeJson(name) << "\":";

            if (!f->IsFieldSetAndNotNull(i)) {
                std::cout << "null";
            } else {
                std::cout << '"'
                          << escapeJson(f->GetFieldAsString(i))
                          << '"';
            }
        }

        std::cout << "},\"geometry\":";

        OGRGeometry* geom = f->GetGeometryRef();
        if (geom) {
            char* json = geom->exportToJson();
            if (json) {
                std::cout << json;
                CPLFree(json);
            } else {
                std::cout << "null";
            }
        } else {
            std::cout << "null";
        }

        std::cout << '}';
    }

    std::cout << "]}\n";
}
using Microsoft.ML;
using Microsoft.ML.Data;
using MovieRecommender.Models;
using System;
using System.Data.SqlClient;
using System.Drawing;
using System.Linq;

namespace MovieRecommender
{
    class Program
    {
        private static readonly byte _ratingThreshold = 7;
        private static string BaseModelRelativePath = @"../../../../MLModel";
        private static string ModelRelativePath = $"{BaseModelRelativePath}/MovieRecommenderModel.zip";
        private static readonly Color color = Color.FromArgb(130, 150, 115);
        static void Main(string[] args)
        {
            
            MLContext mlContext = new MLContext();
            // 1: Load data
            IDataView dataView = LoadData(mlContext);
            dataView = mlContext.Data.Cache(dataView);
            Console.WriteLine("-----------------------Data from database-------------------------");
            // 2: Get some insight
            GetDataInsights(dataView, mlContext);
            // 3: Prepare data
            (IDataView trainingDataView, IDataView testDataView) = PrepareData(dataView, mlContext);
            Console.WriteLine("-----------------------Training data------------------------------");
            GetDataInsights(trainingDataView, mlContext);
            Console.WriteLine("-----------------------Test data----------------------------------");
            GetDataInsights(testDataView, mlContext);
            // 4 & 5: Process data & train model
            ITransformer model = BuildAndTrainModel(mlContext, trainingDataView);
            // 6: Evaluate model
            Console.WriteLine("\n-----------------------Evaluate Model----------------------------------");
            EvaluateModel(mlContext, testDataView, model);

        }
        public static IDataView LoadData(MLContext mlContext)
        {
            DatabaseLoader loader = mlContext.Data.CreateDatabaseLoader<MovieData>();
            string connectionString = @"Data Source=(Local);Database=MovieReviews;Integrated Security=True;Connect Timeout=30";
            string sqlCommand = "SELECT CAST(Reviews.AccountId as varchar(255)) as AccountId, CAST(MovieId as varchar(255)) as MovieId, Genres, Directors, CAST(LanguageId as varchar(255)) as Language, " +
                                $"CAST (CASE WHEN Ratings >= {_ratingThreshold} THEN 1 " +
                                $"WHEN Ratings < {_ratingThreshold} THEN 0 END as bit) as Label " +
                                "FROM Movies INNER JOIN Reviews ON Movies.Id = Reviews.MovieId; ";
            DatabaseSource dbSource = new DatabaseSource(SqlClientFactory.Instance, connectionString, sqlCommand);
            return loader.Load(dbSource);
        }
        public static void GetDataInsights(IDataView data, MLContext mlContext)
        {
            var enumdata = mlContext.Data.CreateEnumerable<MovieData>(data, reuseRowObject: false).ToList();
            Console.WriteLine($"The dataset has {enumdata.ToList().Count} rows. First 4 rows in the dataset: \nAccountId, MovieId, Genres, Directors, Language, Label");
            for (int i = 0; i < 4; i++)
                Console.WriteLine($"{enumdata[i].AccountId}, {enumdata[i].MovieId}, {enumdata[i].Genres}, {enumdata[i].Directors}, {enumdata[i].Language}, {enumdata[i].Label}");
            var users = enumdata.GroupBy(m => m.AccountId).Select(m => m.Key).ToList();
            int min = int.MaxValue;
            foreach (string id in users)
            {
                int count = enumdata.Where(m => m.AccountId == id).ToList().Count;
                if (count < min) min = count;
            }
            Console.WriteLine($"There are {users.Count} users, every users rated at least {min} movies\n");
            int positives = enumdata.Where(m => m.Label).ToList().Count;
            int negatives = enumdata.Where(m => !m.Label).ToList().Count;
            Console.WriteLine($"There are {positives} positive instances, {negatives} negative instances\n");
        }
        public static (IDataView training, IDataView test) PrepareData(IDataView data, MLContext mlContext)
        {
            var split = mlContext.Data.TrainTestSplit(data, testFraction: 0.25, samplingKeyColumnName: null, seed: 42);
            return (split.TrainSet, split.TestSet);
        }
        public static ITransformer BuildAndTrainModel(MLContext mlContext, IDataView trainingDataView)
        {
            var trainingPipeline = mlContext.Transforms.Text.FeaturizeText(outputColumnName: "userIdOneHot", inputColumnName: nameof(MovieData.AccountId))                 
                                            .Append(mlContext.Transforms.Text.FeaturizeText(outputColumnName: "movieIdOneHot", inputColumnName: nameof(MovieData.MovieId)))
                                            .Append(mlContext.Transforms.Categorical.OneHotEncoding(outputColumnName: "languageOneHot", inputColumnName: nameof(MovieData.Language)))
                                            .Append(mlContext.Transforms.Text.FeaturizeText(outputColumnName: "directorOneHot", inputColumnName: nameof(MovieData.Language))
                                            .Append(mlContext.Transforms.Text.FeaturizeText(outputColumnName: "genreOneHot", inputColumnName: nameof(MovieData.Genres)))
                                            .Append(mlContext.Transforms.Concatenate("Features", "userIdOneHot", "movieIdOneHot", "languageOneHot", "directorOneHot", "genreOneHot")))
                                            .Append(mlContext.BinaryClassification.Trainers.FieldAwareFactorizationMachine(new string[] { "Features" }));

            return trainingPipeline.Fit(trainingDataView);
        }
        public static void EvaluateModel(MLContext mlContext, IDataView testDataView, ITransformer model)
        {
            var prediction = model.Transform(testDataView);
            var metrics = mlContext.BinaryClassification.Evaluate(data: prediction, labelColumnName: "Label", scoreColumnName: "Score", predictedLabelColumnName: "PredictedLabel");
            Console.WriteLine("Evaluation Metrics: Accuracy: " + Math.Round(metrics.Accuracy, 2) + " AreaUnderRocCurve(AUC): " + Math.Round(metrics.AreaUnderRocCurve, 2), color);
        }
        
    }
}
